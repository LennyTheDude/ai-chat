import { AIModel } from "@/lib/ai";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id: chatId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id, model, gpt_id, metadata")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single();

  if (chatError || !chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return Response.json({ error: messagesError.message }, { status: 500 });
  }

  return Response.json({
    messages: messages ?? [],
    model: chat.model as AIModel,
    gpt_id: chat.gpt_id,
    metadata: chat.metadata,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: chatId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { model?: string; restart?: boolean };

  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id, model, gpt_id")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single();

  if (chatError || !chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  if (body.restart) {
    const { error: deleteMessagesError } = await supabase.from("messages").delete().eq("chat_id", chatId);
    if (deleteMessagesError) {
      return Response.json({ error: deleteMessagesError.message }, { status: 500 });
    }

    const { data: restartedChat, error: restartError } = await supabase
      .from("chats")
      .update({ metadata: {} })
      .eq("id", chatId)
      .eq("user_id", user.id)
      .select("id, model, gpt_id, metadata")
      .single();

    if (restartError) {
      return Response.json({ error: restartError.message }, { status: 500 });
    }

    return Response.json({ chat: restartedChat });
  }

  const model = body.model;
  if (!model || !Object.values(AIModel).includes(model as AIModel)) {
    return Response.json({ error: "Invalid or missing model." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("chats")
    .update({ model })
    .eq("id", chatId)
    .eq("user_id", user.id)
    .select("id, model")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  return Response.json({ chat: data });
}
