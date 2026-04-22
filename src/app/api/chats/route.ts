import { AIModel } from "@/lib/ai";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("chats")
    .select("id, title, model, gpt_id, metadata, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ chats: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    model?: string;
    gpt_id?: string;
    metadata?: Record<string, unknown> | null;
  };
  const title = body.title?.trim() ? body.title.trim() : "New chat";
  const model = Object.values(AIModel).includes(body.model as AIModel)
    ? (body.model as AIModel)
    : AIModel.OPENAI;
  const gptId = typeof body.gpt_id === "string" ? body.gpt_id : null;
  const metadata = body.metadata ?? null;

  const { data, error } = await supabase
    .from("chats")
    .insert({ user_id: user.id, title, model, gpt_id: gptId, metadata })
    .select("id, title, model, gpt_id, metadata, created_at")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ chat: data }, { status: 201 });
}
