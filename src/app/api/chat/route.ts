import { AIModel, getModel } from "@/lib/ai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { streamText } from "ai";

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

  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single();

  if (chatError || !chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

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

        const usedTokens = totalUsage.totalTokens ?? 0;
        if (usedTokens > 0) {
          const { data: usageRow } = await supabase
            .from("usage")
            .select("tokens_used")
            .eq("user_id", user.id)
            .maybeSingle();

          const nextTokens = (usageRow?.tokens_used ?? 0) + usedTokens;
          await supabase
            .from("usage")
            .upsert({ user_id: user.id, tokens_used: nextTokens }, { onConflict: "user_id" });
        }
      },
    });

    return result.toTextStreamResponse({
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "Failed to generate AI response. Check provider API keys." },
      { status: 500 },
    );
  }
}
