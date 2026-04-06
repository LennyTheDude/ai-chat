"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessageFromResponse } from "@/lib/apiErrors";
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
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
    const payload = (await response.json()) as { messages?: ChatMessage[]; error?: string };
    if (redirectIfUnauthorized(response)) return;

    if (!response.ok) {
      setError(await getErrorMessageFromResponse(response, payload));
      setIsLoadingMessages(false);
      return;
    }

    setMessages(payload.messages ?? []);
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
      const firstChatId = nextChats[0].id;
      setActiveChatId(firstChatId);
      await loadMessages(firstChatId);
    } else {
      setMessages([]);
      setActiveChatId(null);
    }

    setIsLoadingChats(false);
  }, [loadMessages, redirectIfUnauthorized]);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  const createChat = async (title?: string) => {
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
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

  const streamAssistantReply = async (
    chatId: string,
    conversation: ChatMessage[],
    selectedModel: ChatModel,
  ) => {
    const assistantId = crypto.randomUUID();
    setMessages((previous) => [...previous, { id: assistantId, role: "assistant", content: "" }]);

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
  };

  const handleSendMessage = async (content: string) => {
    setIsSending(true);
    setError(null);

    try {
      let chatId = activeChatId;

      if (!chatId) {
        const nextTitle = content.slice(0, 40);
        chatId = await createChat(nextTitle || "New chat");
        setActiveChatId(chatId);
        setMessages([]);
      }

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          role: "user",
          content,
        }),
      });
      const payload = (await response.json()) as { message?: ChatMessage; error?: string };
      if (redirectIfUnauthorized(response)) {
        return;
      }

      if (!response.ok || !payload.message) {
        throw new Error(await getErrorMessageFromResponse(response, payload));
      }

      const userRow = payload.message;
      const historyForModel = [...messagesRef.current, userRow];
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
    void loadMessages(chatId);
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setError(null);
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
              Chat
            </h1>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "#6b7280" }}>
              Model: {getModelDisplayLabel(model)}
            </p>
          </div>
          <ModelSelector value={model} onChange={setModel} />
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

        {isSending ? (
          <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: 0 }}>Sending or streaming response…</p>
        ) : null}

        <MessageInput
          onSendMessage={(content) => void handleSendMessage(content)}
          disabled={isSending}
          onDismissError={() => setError(null)}
        />
      </div>
    </section>
  );
}
