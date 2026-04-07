import { createSupabaseServerClient } from "@/lib/supabase/server";

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
