"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessageFromResponse } from "@/lib/apiErrors";
import { customGPTs, type CustomGPT } from "@/lib/custom-gpts";
import { getModelDisplayLabel } from "@/lib/modelLabels";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { ModelSelector } from "./ModelSelector";
import type { ChatMessage, ChatModel, ChatSummary } from "./types";

export function ChatContainer() {
  const router = useRouter();
  const [model, setModel] = useState<ChatModel>("openai");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeGptId, setActiveGptId] = useState<string | null>(null);
  const [activeGpt, setActiveGpt] = useState<CustomGPT | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const scrollRafRef = useRef<number | null>(null);
  const [isReplyStreaming, setIsReplyStreaming] = useState(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const isQuizSimpleChat = activeGpt?.type === "quiz_simple";
  const isInputDisabled = isSending || isRestarting;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const scroll = () => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: isReplyStreaming || isQuizSimpleChat ? "auto" : "smooth",
      });
      scrollRafRef.current = null;
    };

    if (isReplyStreaming) {
      if (scrollRafRef.current === null) {
        scrollRafRef.current = requestAnimationFrame(scroll);
      }
    } else {
      scroll();
    }
  }, [messages, isReplyStreaming, isQuizSimpleChat]);

  const redirectIfUnauthorized = useCallback(
    (response: Response) => {
      if (response.status === 401) {
        router.replace("/auth");
        return true;
      }
      return false;
    },
    [router],
  );

  const loadMessages = useCallback(async (chatId: string) => {
    setIsLoadingMessages(true);
    setError(null);
    const response = await fetch(`/api/chats/${chatId}`);
    const payload = (await response.json()) as {
      messages?: ChatMessage[];
      model?: ChatModel;
      gpt_id?: string | null;
      error?: string;
    };
    if (redirectIfUnauthorized(response)) return;

    if (!response.ok) {
      setError(await getErrorMessageFromResponse(response, payload));
      setIsLoadingMessages(false);
      return;
    }

    const list = payload.messages ?? [];
    setMessages(list);
    if (payload.model === "claude" || payload.model === "openai") {
      setModel(payload.model);
    } else {
      setModel("openai");
    }
    const nextGptId = payload.gpt_id ?? null;
    setActiveGptId(nextGptId);
    setActiveGpt(nextGptId ? customGPTs.find((gpt) => gpt.id === nextGptId) ?? null : null);
    setIsLoadingMessages(false);
  }, [redirectIfUnauthorized]);

  const loadChats = useCallback(async () => {
    setIsLoadingChats(true);
    setError(null);

    const response = await fetch("/api/chats");
    const payload = (await response.json()) as { chats?: ChatSummary[]; error?: string };
    if (redirectIfUnauthorized(response)) return;

    if (!response.ok) {
      setError(await getErrorMessageFromResponse(response, payload));
      setIsLoadingChats(false);
      return;
    }

    const nextChats = payload.chats ?? [];
    setChats(nextChats);

    if (nextChats.length > 0) {
      const firstChat = nextChats[0];
      const firstChatId = firstChat.id;
      setActiveChatId(firstChatId);
      setActiveGptId(firstChat.gpt_id ?? null);
      await loadMessages(firstChatId);
    } else {
      setMessages([]);
      setActiveChatId(null);
      setActiveGptId(null);
      setActiveGpt(null);
    }

    setIsLoadingChats(false);
  }, [loadMessages, redirectIfUnauthorized]);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  const createChat = async (title?: string, preferredModel: ChatModel = "openai") => {
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, model: preferredModel }),
    });
    const payload = (await response.json()) as { chat?: ChatSummary; error?: string };
    if (redirectIfUnauthorized(response)) {
      throw new Error("Unauthorized");
    }

    if (!response.ok || !payload.chat) {
      throw new Error(await getErrorMessageFromResponse(response, payload));
    }

    setChats((previous) => [payload.chat!, ...previous]);
    return payload.chat.id;
  };

  const createGptChat = async (gptId: string) => {
    const selectedGpt = customGPTs.find((gpt) => gpt.id === gptId);
    const title = selectedGpt?.name ?? "New chat";
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        model: "openai",
        gpt_id: gptId,
        metadata: {},
      }),
    });
    const payload = (await response.json()) as { chat?: ChatSummary; error?: string };
    if (redirectIfUnauthorized(response)) {
      throw new Error("Unauthorized");
    }
    if (!response.ok || !payload.chat) {
      throw new Error(await getErrorMessageFromResponse(response, payload));
    }
    setChats((previous) => [payload.chat!, ...previous]);
    return payload.chat;
  };

  const streamAssistantReply = async (
    chatId: string,
    conversation: ChatMessage[],
    selectedModel: ChatModel,
  ) => {
    const assistantId = crypto.randomUUID();
    setIsReplyStreaming(true);
    setMessages((previous) => [...previous, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          model: selectedModel,
          messages: conversation.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setMessages((previous) => previous.filter((m) => m.id !== assistantId));
        if (redirectIfUnauthorized(response)) {
          throw new Error("Unauthorized");
        }
        throw new Error(await getErrorMessageFromResponse(response, payload));
      }

      if (!response.body) {
        setMessages((previous) => previous.filter((m) => m.id !== assistantId));
        throw new Error("No response body from assistant.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aggregated = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          aggregated += decoder.decode(value, { stream: true });
          setMessages((previous) =>
            previous.map((message) =>
              message.id === assistantId ? { ...message, content: aggregated } : message,
            ),
          );
        }
      } catch {
        setMessages((previous) => previous.filter((m) => m.id !== assistantId));
        throw new Error("Stream interrupted. Try sending again.");
      }
    } finally {
      setIsReplyStreaming(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    setIsSending(true);
    setError(null);

    try {
      let chatId = activeChatId;
      const startedWithoutActiveChat = activeChatId === null;

      if (!chatId) {
        const nextTitle = content.slice(0, 40);
        chatId = await createChat(nextTitle || "New chat", model);
        setActiveChatId(chatId);
        setMessages([]);
      }

      const userRow: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };
      const priorMessages = startedWithoutActiveChat ? [] : messagesRef.current;
      const historyForModel = [...priorMessages, userRow];
      setMessages(historyForModel);
      await streamAssistantReply(chatId, historyForModel, model);
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Unable to send message.";
      if (message === "Unauthorized") return;
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setError(null);
    const selectedChat = chats.find((chat) => chat.id === chatId);
    const nextGptId = selectedChat?.gpt_id ?? null;
    setActiveGptId(nextGptId);
    setActiveGpt(nextGptId ? customGPTs.find((gpt) => gpt.id === nextGptId) ?? null : null);
    void loadMessages(chatId);
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setActiveGptId(null);
    setActiveGpt(null);
    setMessages([]);
    setModel("openai");
    setError(null);
  };

  const handleSelectCustomGpt = async (gptId: string) => {
    setError(null);
    try {
      const chat = await createGptChat(gptId);
      setActiveChatId(chat.id);
      setActiveGptId(chat.gpt_id ?? gptId);
      setActiveGpt(customGPTs.find((gpt) => gpt.id === (chat.gpt_id ?? gptId)) ?? null);
      setModel(chat.model);
      setMessages([]);
      void loadMessages(chat.id);
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Unable to create GPT chat.";
      if (message === "Unauthorized") return;
      setError(message);
    }
  };

  const handleModelChange = async (next: ChatModel) => {
    const previous = model;
    setModel(next);
    if (!activeChatId) return;

    const response = await fetch(`/api/chats/${activeChatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: next }),
    });
    const payload = (await response.json()) as { error?: string };
    if (redirectIfUnauthorized(response)) {
      setModel(previous);
      return;
    }
    if (!response.ok) {
      setModel(previous);
      setError(await getErrorMessageFromResponse(response, payload));
      return;
    }
    setChats((chatsPrev) =>
      chatsPrev.map((c) => (c.id === activeChatId ? { ...c, model: next } : c)),
    );
  };

  const handleRestartChat = async () => {
    if (!activeChatId || !activeGpt) return;
    setIsRestarting(true);
    setError(null);

    const response = await fetch(`/api/chats/${activeChatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restart: true }),
    });
    const payload = (await response.json()) as { error?: string };
    if (redirectIfUnauthorized(response)) {
      setIsRestarting(false);
      return;
    }
    if (!response.ok) {
      setError(await getErrorMessageFromResponse(response, payload));
      setIsRestarting(false);
      return;
    }

    setMessages([]);
    setIsRestarting(false);
  };

  const sidebarButtonBase: CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "0.5rem 0.65rem",
    textAlign: "left",
    background: "#fff",
    cursor: "pointer",
    fontSize: "0.875rem",
    lineHeight: 1.35,
    transition: "background 0.15s ease",
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const emptyHintMain =
    !isLoadingChats && chats.length === 0 && activeChatId === null
      ? "No chats yet. Send a message below to start your first conversation."
      : !activeChatId && chats.length > 0
        ? "New chat — send a message to create it."
        : activeChatId && !isLoadingMessages && messages.length === 0
          ? "Send a message to begin this chat."
          : null;

  return (
    <section
      style={{
        maxWidth: 920,
        margin: "0 auto",
        padding: "2rem 1.25rem",
        display: "flex",
        flexDirection: "row",
        gap: "1.25rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <aside
        style={{
          width: 232,
          flexShrink: 0,
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          background: "#fafafa",
        }}
      >
        <button
          type="button"
          onClick={handleNewChat}
          style={{
            border: "1px solid #171717",
            borderRadius: 10,
            padding: "0.55rem 0.75rem",
            background: "#171717",
            color: "#fff",
            cursor: "pointer",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          + New chat
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <p style={{ margin: "0.15rem 0", fontSize: "0.78rem", color: "#6b7280", fontWeight: 600 }}>
            Custom GPTs
          </p>
          {customGPTs.map((gpt) => (
            <button
              key={gpt.id}
              type="button"
              onClick={() => void handleSelectCustomGpt(gpt.id)}
              title={gpt.description}
              style={{
                ...sidebarButtonBase,
                background: activeGptId === gpt.id ? "#e5e7eb" : "#fff",
                fontWeight: activeGptId === gpt.id ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (activeGptId !== gpt.id) e.currentTarget.style.background = "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                if (activeGptId !== gpt.id) e.currentTarget.style.background = "#fff";
              }}
            >
              {gpt.name}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <p style={{ margin: "0.15rem 0", fontSize: "0.78rem", color: "#6b7280", fontWeight: 600 }}>
            Chats
          </p>
          {isLoadingChats ? (
            <>
              {[0, 1, 2].map((i) => (
                <div key={i} className="chat-sidebar-skeleton" />
              ))}
            </>
          ) : chats.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.5, margin: 0 }}>
              No saved chats yet.
            </p>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                onClick={() => handleSelectChat(chat.id)}
                title={chat.title}
                style={{
                  ...sidebarButtonBase,
                  background: activeChatId === chat.id ? "#e5e7eb" : "#fff",
                  fontWeight: activeChatId === chat.id ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (activeChatId !== chat.id) e.currentTarget.style.background = "#f3f4f6";
                }}
                onMouseLeave={(e) => {
                  if (activeChatId !== chat.id) e.currentTarget.style.background = "#fff";
                }}
              >
                {chat.title.length > 28 ? `${chat.title.slice(0, 28)}…` : chat.title}
              </button>
            ))
          )}
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem", minWidth: 0 }}>
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem 1rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              {activeGpt?.name ?? "Chat"}
            </h1>
            {activeGpt ? (
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: "#6b7280" }}>
                {activeGpt.description}
              </p>
            ) : null}
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "#6b7280" }}>
              Model: {getModelDisplayLabel(model)}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {activeGpt && activeChatId ? (
              <button
                type="button"
                onClick={() => void handleRestartChat()}
                disabled={isRestarting}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: 10,
                  padding: "0.45rem 0.7rem",
                  background: isRestarting ? "#f9fafb" : "#fff",
                  color: "#111827",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: isRestarting ? "not-allowed" : "pointer",
                }}
              >
                {isRestarting ? "Restarting..." : "Restart"}
              </button>
            ) : null}
            <ModelSelector value={model} onChange={(next) => void handleModelChange(next)} />
          </div>
        </header>

        <div
          ref={scrollRef}
          style={{
            minHeight: 360,
            maxHeight: "min(58vh, 520px)",
            overflowY: "auto",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: "1.1rem",
            background: "#fff",
            scrollBehavior: "smooth",
          }}
        >
          {isLoadingMessages ? (
            <p style={{ fontSize: "0.95rem", color: "#6b7280", margin: 0, padding: "1rem 0" }}>
              Loading messages…
            </p>
          ) : (
            <MessageList messages={messages} emptyHint={emptyHintMain} />
          )}
        </div>

        {error ? (
          <div
            role="alert"
            style={{
              color: "#b91c1c",
              fontSize: "0.9rem",
              lineHeight: 1.45,
              padding: "0.65rem 0.85rem",
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        ) : null}

        {isQuizSimpleChat ? (
          <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: 0 }}>Hint: Answer A/B/C/D</p>
        ) : null}

        {isSending ? (
          <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: 0 }}>
            {isQuizSimpleChat ? "Checking answer..." : "Sending or streaming response…"}
          </p>
        ) : null}

        <MessageInput
          onSendMessage={(content) => void handleSendMessage(content)}
          disabled={isInputDisabled}
          onDismissError={() => setError(null)}
        />
      </div>
    </section>
  );
}
