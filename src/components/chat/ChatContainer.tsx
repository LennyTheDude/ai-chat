"use client";

import { useState } from "react";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { ModelSelector } from "./ModelSelector";
import type { ChatMessage, ChatModel } from "./types";

function createMockAssistantReply(model: ChatModel): string {
  // Keep this hardcoded in Phase 1; real model calls are added later.
  if (model === "claude") {
    return "Claude mock reply: I got your message and this is a placeholder response.";
  }

  return "OpenAI mock reply: I got your message and this is a placeholder response.";
}

export function ChatContainer() {
  const [model, setModel] = useState<ChatModel>("openai");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleSendMessage = (content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    setMessages((previous) => [...previous, userMessage]);

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: createMockAssistantReply(model),
    };

    // Simulate async behavior while keeping all data local.
    window.setTimeout(() => {
      setMessages((previous) => [...previous, assistantMessage]);
    }, 300);
  };

  return (
    <section
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "2rem 1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
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

      <MessageInput onSendMessage={handleSendMessage} />
    </section>
  );
}
