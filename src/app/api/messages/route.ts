import { createSupabaseServerClient } from "@/lib/supabase/server";

const REQUEST_LIMIT = 100;

type CreateMessageBody = {
  chatId?: string;
  role?: "user" | "assistant";
  content?: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as CreateMessageBody;
  const chatId = body.chatId;
  const role = body.role;
  const content = body.content?.trim();

  if (!chatId || !role || !content) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
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

  if (role === "user") {
    const { data: usage, error: usageError } = await supabase
      .from("usage")
      .select("requests_count")
      .eq("user_id", user.id)
      .maybeSingle();

    if (usageError) {
      return Response.json({ error: usageError.message }, { status: 500 });
    }

    const currentRequests = usage?.requests_count ?? 0;
    if (currentRequests >= REQUEST_LIMIT) {
      return Response.json(
        { error: `Request limit exceeded. Max ${REQUEST_LIMIT} messages.` },
        { status: 429 },
      );
    }

    const nextUsageRow =
      usage === null
        ? { user_id: user.id, requests_count: 1, tokens_used: 0 }
        : { user_id: user.id, requests_count: currentRequests + 1 };

    const { error: usageUpdateError } = await supabase
      .from("usage")
      .upsert(nextUsageRow, { onConflict: "user_id" });

    if (usageUpdateError) {
      return Response.json({ error: usageUpdateError.message }, { status: 500 });
    }
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      chat_id: chatId,
      role,
      content,
    })
    .select("id, role, content, created_at")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ message: data }, { status: 201 });
}
