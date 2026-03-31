export enum AIModel {
  OPENAI = "openai",
  CLAUDE = "claude",
}

export function getModel(model: AIModel) {
  // Keep this abstraction lightweight until real provider wiring in Phase 7.
  if (model === AIModel.CLAUDE) {
    return { provider: "anthropic", model: "claude-stub" };
  }

  return { provider: "openai", model: "gpt-stub" };
}
