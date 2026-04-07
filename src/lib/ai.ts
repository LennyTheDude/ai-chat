import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";

export enum AIModel {
  OPENAI = "openai",
  CLAUDE = "claude",
}

export function getModel(model: AIModel) {
  if (model === AIModel.CLAUDE) {
    return anthropic("claude-haiku-4-5");
  }

  return openai("gpt-4o-mini");
}
