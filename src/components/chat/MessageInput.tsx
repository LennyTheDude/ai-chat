import type { CSSProperties } from "react";
import { FormEvent, useState } from "react";

type MessageInputProps = {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  /** Clear chat errors when the user focuses or edits the input. */
  onDismissError?: () => void;
};

const inputStyle: CSSProperties = {
  flex: 1,
  padding: "0.7rem 0.85rem",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: "0.95rem",
  lineHeight: 1.45,
};

const buttonStyle = (disabled: boolean): CSSProperties => ({
  padding: "0.7rem 1rem",
  borderRadius: 10,
  border: "1px solid #171717",
  background: disabled ? "#9ca3af" : "#171717",
  color: "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: "0.95rem",
  fontWeight: 500,
});

export function MessageInput({
  onSendMessage,
  disabled = false,
  onDismissError,
}: MessageInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedValue = value.trim();
    if (!trimmedValue || disabled) return;

    onSendMessage(trimmedValue);
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.65rem", alignItems: "stretch" }}>
      <input
        value={value}
        onChange={(event) => {
          onDismissError?.();
          setValue(event.target.value);
        }}
        onFocus={() => onDismissError?.()}
        placeholder="Type your message…"
        disabled={disabled}
        style={{
          ...inputStyle,
          opacity: disabled ? 0.85 : 1,
        }}
      />
      <button type="submit" disabled={disabled} style={buttonStyle(disabled)}>
        Send
      </button>
    </form>
  );
}
