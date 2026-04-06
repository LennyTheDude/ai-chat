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
      type="button"
      onClick={handleSignOut}
      style={{
        border: "1px solid #d1d5db",
        borderRadius: 10,
        background: "#fff",
        padding: "0.5rem 0.85rem",
        cursor: "pointer",
        color: "#374151",
        fontSize: "0.875rem",
        fontWeight: 500,
      }}
    >
      Sign out
    </button>
  );
}
