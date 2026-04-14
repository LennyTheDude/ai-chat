export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  created_at?: string;
};

export type ChatModel = "openai" | "claude";

export type ChatSummary = {
  id: string;
  title: string;
  model: ChatModel;
  created_at: string;
};
