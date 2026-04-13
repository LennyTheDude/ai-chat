import { ChatMarkdown } from "./ChatMarkdown";
import type { ChatMessage } from "./types";

type MessageListProps = {
  messages: ChatMessage[];
  /** When there are no messages, show this instead of the generic hint. */
  emptyHint?: string | null;
};

export function MessageList({ messages, emptyHint }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div
        style={{
          color: "var(--muted, #666)",
          fontSize: "0.95rem",
          lineHeight: 1.55,
          textAlign: "center",
          padding: "2rem 0.5rem",
        }}
      >
        {emptyHint ?? "No messages yet. Start by typing below."}
      </div>
    );
  }

  const last = messages[messages.length - 1];
  const awaitingTokens = last.role === "assistant" && last.content === "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      {messages.map((message) => {
        const isUser = message.role === "user";
        const isThisAwaiting = !isUser && awaitingTokens && message.id === last.id;
        const body = isUser ? (
          message.content ||
          (isThisAwaiting ? (
            <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Responding…</span>
          ) : null)
        ) : message.content ? (
          <ChatMarkdown content={message.content} />
        ) : isThisAwaiting ? (
          <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Responding…</span>
        ) : null;

        return (
          <div
            key={message.id}
            style={{
              maxWidth: "85%",
              alignSelf: isUser ? "flex-end" : "flex-start",
              padding: "0.7rem 0.9rem",
              borderRadius: 12,
              lineHeight: 1.5,
              fontSize: "0.95rem",
              background: isUser ? "#171717" : "#f3f4f6",
              color: isUser ? "#fff" : "#171717",
              wordBreak: "break-word",
            }}
          >
            {body}
          </div>
        );
      })}
    </div>
  );
}
