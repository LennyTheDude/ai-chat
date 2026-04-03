"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { ModelSelector } from "./ModelSelector";
import type { ChatMessage, ChatModel, ChatSummary } from "./types";

export function ChatContainer() {
  const [model, setModel] = useState<ChatModel>("openai");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async (chatId: string) => {
    const response = await fetch(`/api/chats/${chatId}`);
    const payload = (await response.json()) as { messages?: ChatMessage[]; error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Failed to load messages.");
      return;
    }

    setMessages(payload.messages ?? []);
  }, []);

  const loadChats = useCallback(async () => {
    setIsLoadingChats(true);
    setError(null);

    const response = await fetch("/api/chats");
    const payload = (await response.json()) as { chats?: ChatSummary[]; error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Failed to load chats.");
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
    }

    setIsLoadingChats(false);
  }, [loadMessages]);

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

    if (!response.ok || !payload.chat) {
      throw new Error(payload.error ?? "Failed to create chat.");
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

    if (!response.ok || !response.body) {
      throw new Error("Failed to stream assistant response.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let aggregated = "";

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

      if (!response.ok || !payload.message) {
        throw new Error(payload.error ?? "Failed to save message.");
      }

      setMessages((previous) => [...previous, payload.message!]);
      const conversation = [...messages, payload.message];
      await streamAssistantReply(chatId, conversation, model);
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Unable to send message.";
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectChat = async (chatId: string) => {
    setActiveChatId(chatId);
    setError(null);
    await loadMessages(chatId);
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setError(null);
  };

  return (
    <section
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "2rem 1.25rem",
        display: "flex",
        flexDirection: "row",
        gap: "1rem",
      }}
    >
      <aside
        style={{
          width: 220,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.65rem",
        }}
      >
        <button
          onClick={handleNewChat}
          style={{ border: "1px solid #ddd", borderRadius: 8, padding: "0.5rem", background: "#fff", cursor: "pointer", color: "#000" }}
        >
          + New chat
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {isLoadingChats ? (
            <p style={{ fontSize: "0.9rem", color: "#666" }}>Loading chats...</p>
          ) : chats.length === 0 ? (
            <p style={{ fontSize: "0.9rem", color: "#666" }}>No saved chats yet.</p>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => void handleSelectChat(chat.id)}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: "0.45rem 0.55rem",
                  textAlign: "left",
                  background: activeChatId === chat.id ? "#f3f4f6" : "#fff",
                  cursor: "pointer",
                }}
              >
                {chat.title}
              </button>
            ))
          )}
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
          <h1 style={{ fontSize: "1.5rem" }}>Chat</h1>
          <ModelSelector value={model} onChange={setModel} />
        </header>

        <div
          style={{
            minHeight: 380,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          <MessageList messages={messages} />
        </div>

        {error ? <p style={{ color: "#b91c1c", fontSize: "0.9rem" }}>{error}</p> : null}

        <MessageInput onSendMessage={(content) => void handleSendMessage(content)} disabled={isSending} />
      </div>
    </section>
  );
}
