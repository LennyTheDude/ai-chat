"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup";

export function AuthForm() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    const credentials = { email: email.trim(), password };
    const result =
      mode === "signup"
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);

    if (result.error) {
      setStatus(result.error.message);
      setIsSubmitting(false);
      return;
    }

    if (mode === "signup") {
      setStatus("Sign up successful. Check your email for confirmation.");
      setIsSubmitting(false);
      return;
    }

    router.push("/chat");
    router.refresh();
  };

  const handleSignOut = async () => {
    setStatus(null);
    const { error } = await supabase.auth.signOut();

    if (error) {
      setStatus(error.message);
      return;
    }

    router.refresh();
    setStatus("Signed out.");
  };

  return (
    <section
      style={{
        maxWidth: 420,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "0.9rem",
      }}
    >
      <h1 style={{ fontSize: "1.5rem" }}>Account</h1>
      <p style={{ color: "#666", fontSize: "0.95rem" }}>
        Use email/password auth for this starter setup.
      </p>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={() => setMode("signin")}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "0.5rem 0.75rem",
            background: mode === "signin" ? "#171717" : "#fff",
            color: mode === "signin" ? "#fff" : "#171717",
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "0.5rem 0.75rem",
            background: mode === "signup" ? "#171717" : "#fff",
            color: mode === "signup" ? "#fff" : "#171717",
          }}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
          style={{ padding: "0.7rem", borderRadius: 8, border: "1px solid #ddd" }}
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          required
          minLength={6}
          style={{ padding: "0.7rem", borderRadius: 8, border: "1px solid #ddd" }}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "0.7rem",
            borderRadius: 8,
            border: "1px solid #171717",
            background: "#171717",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {isSubmitting ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleSignOut}
        style={{ alignSelf: "flex-start", border: "none", background: "transparent", color: "#444" }}
      >
        Sign out
      </button>

      {status ? <p style={{ fontSize: "0.9rem", color: "#555" }}>{status}</p> : null}
    </section>
  );
}
