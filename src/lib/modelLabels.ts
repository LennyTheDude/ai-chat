import type { ChatModel } from "@/components/chat/types";

/** Human-readable labels aligned with `getModel` in `lib/ai.ts`. */
export function getModelDisplayLabel(model: ChatModel): string {
  if (model === "claude") {
    return "Claude (Haiku)";
  }
  return "OpenAI (gpt-4o-mini)";
}
