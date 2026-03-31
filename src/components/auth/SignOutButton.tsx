"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        background: "#fff",
        padding: "0.45rem 0.7rem",
        cursor: "pointer",
        color: "#000",
      }}
    >
      Sign out
    </button>
  );
}
