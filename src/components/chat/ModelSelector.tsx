import type { ChatModel } from "./types";

type ModelSelectorProps = {
  value: ChatModel;
  onChange: (model: ChatModel) => void;
};

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <label
      style={{
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
        fontSize: "0.875rem",
        color: "var(--muted, #6b7280)",
      }}
    >
      <span style={{ fontWeight: 500 }}>Model</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as ChatModel)}
        style={{
          padding: "0.45rem 0.65rem",
          borderRadius: 10,
          border: "1px solid #d1d5db",
          background: "#fff",
          fontSize: "0.875rem",
          cursor: "pointer",
          color: "#111827",
        }}
      >
        <option value="openai">OpenAI</option>
        <option value="claude">Claude</option>
      </select>
    </label>
  );
}
