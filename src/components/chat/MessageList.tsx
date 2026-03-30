import type { ChatMessage } from "./types";

type MessageListProps = {
  messages: ChatMessage[];
};

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div style={{ color: "#666", fontSize: "0.95rem" }}>
        No messages yet. Start by typing below.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {messages.map((message) => {
        const isUser = message.role === "user";

        return (
          <div
            key={message.id}
            style={{
              maxWidth: "80%",
              alignSelf: isUser ? "flex-end" : "flex-start",
              padding: "0.65rem 0.8rem",
              borderRadius: 10,
              lineHeight: 1.45,
              background: isUser ? "#171717" : "#f3f4f6",
              color: isUser ? "#fff" : "#171717",
            }}
          >
            {message.content}
          </div>
        );
      })}
    </div>
  );
}
