import { AIModel, getModel } from "@/lib/ai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { streamText } from "ai";

const DAILY_TOKEN_LIMIT = 10000;

type ChatApiMessage = {
  role?: "user" | "assistant" | "system";
  content?: string;
};

type ChatApiRequest = {
  chatId?: string;
  model?: AIModel;
  messages?: ChatApiMessage[];
};

export async function POST(request: Request) {
  const prepStarted = performance.now();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as ChatApiRequest;
  const chatId = body.chatId;
  const model = body.model;
  const messages = body.messages;

  if (!chatId || !model || !messages || !Array.isArray(messages)) {
    return Response.json(
      { error: "Invalid request body. Expected chatId, model and messages." },
      { status: 400 },
    );
  }

  if (!Object.values(AIModel).includes(model)) {
    return Response.json({ error: "Unsupported model." }, { status: 400 });
  }

  const provider = model === AIModel.CLAUDE ? "anthropic" : "openai";
  const providerLabel = provider === "anthropic" ? "Claude" : "OpenAI";
  const today = new Date().toISOString().slice(0, 10);

  const [chatResult, usageResult] = await Promise.all([
    supabase.from("chats").select("id").eq("id", chatId).eq("user_id", user.id).single(),
    supabase
      .from("usage")
      .select("total_tokens")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("day", today)
      .maybeSingle(),
  ]);

  if (chatResult.error || !chatResult.data) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  if (usageResult.error) {
    return Response.json({ error: usageResult.error.message }, { status: 500 });
  }

  const usedToday = usageResult.data?.total_tokens ?? 0;
  if (usedToday >= DAILY_TOKEN_LIMIT) {
    return Response.json(
      { error: `${providerLabel} daily token limit reached (${DAILY_TOKEN_LIMIT}/day).` },
      { status: 429 },
    );
  }

  const last = messages[messages.length - 1];
  if (last?.role !== "user") {
    return Response.json(
      { error: "Last message must be a user message when starting a turn." },
      { status: 400 },
    );
  }

  const userContent = last.content?.trim() ?? "";
  if (!userContent) {
    return Response.json({ error: "User message content is required." }, { status: 400 });
  }

  const { error: insertError } = await supabase.from("messages").insert({
    chat_id: chatId,
    role: "user",
    content: userContent,
  });

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  const { error: modelUpdateError } = await supabase
    .from("chats")
    .update({ model })
    .eq("id", chatId)
    .eq("user_id", user.id);

  if (modelUpdateError) {
    return Response.json({ error: modelUpdateError.message }, { status: 500 });
  }

  const prepMs = Math.round(performance.now() - prepStarted);

  try {
    const result = streamText({
      model: getModel(model),
      messages: messages.map((message) => ({
        role: message.role ?? "user",
        content: message.content ?? "",
      })),
      onFinish: async ({ text, totalUsage }) => {
        if (text.trim()) {
          await supabase.from("messages").insert({
            chat_id: chatId,
            role: "assistant",
            content: text,
          });
        }

        const inputTokens = totalUsage.inputTokens ?? 0;
        const outputTokens = totalUsage.outputTokens ?? 0;
        const totalTokens = totalUsage.totalTokens ?? inputTokens + outputTokens;

        if (totalTokens <= 0) return;

        const { data: existingUsage } = await supabase
          .from("usage")
          .select("input_tokens, output_tokens, total_tokens")
          .eq("user_id", user.id)
          .eq("provider", provider)
          .eq("day", today)
          .maybeSingle();

        const nextInput = (existingUsage?.input_tokens ?? 0) + inputTokens;
        const nextOutput = (existingUsage?.output_tokens ?? 0) + outputTokens;
        const nextTotal = (existingUsage?.total_tokens ?? 0) + totalTokens;

        await supabase.from("usage").upsert(
          {
            user_id: user.id,
            provider,
            day: today,
            input_tokens: nextInput,
            output_tokens: nextOutput,
            total_tokens: nextTotal,
          },
          { onConflict: "user_id,provider,day" },
        );
      },
    });

    return result.toTextStreamResponse({
      headers: {
        "Cache-Control": "no-store",
        "Server-Timing": `prep;dur=${prepMs};desc="before-llm"`,
      },
    });
  } catch {
    return Response.json(
      { error: "Failed to generate AI response. Check provider API keys." },
      { status: 500 },
    );
  }
}
