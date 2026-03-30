import { FormEvent, useState } from "react";

type MessageInputProps = {
  onSendMessage: (message: string) => void;
};

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    onSendMessage(trimmedValue);
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Type your message..."
        style={{
          flex: 1,
          padding: "0.7rem 0.8rem",
          borderRadius: 8,
          border: "1px solid #ddd",
          fontSize: "0.95rem",
        }}
      />
      <button
        type="submit"
        style={{
          padding: "0.7rem 0.9rem",
          borderRadius: 8,
          border: "1px solid #171717",
          background: "#171717",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Send
      </button>
    </form>
  );
}
