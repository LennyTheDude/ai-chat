import { ChatContainer } from "@/components/chat/ChatContainer";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ChatPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <main>
      <div style={{ maxWidth: 860, margin: "1rem auto 0", padding: "0 1.25rem", display: "flex", justifyContent: "flex-end" }}>
        <SignOutButton />
      </div>
      <ChatContainer />
    </main>
  );
}
