import type { ChatModel } from "./types";

type ModelSelectorProps = {
  value: ChatModel;
  onChange: (model: ChatModel) => void;
};

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <span style={{ fontSize: "0.9rem", color: "#666" }}>Model</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as ChatModel)}
        style={{ padding: "0.4rem 0.5rem", borderRadius: 6, border: "1px solid #ddd" }}
      >
        <option value="openai">OpenAI</option>
        <option value="claude">Claude</option>
      </select>
    </label>
  );
}
