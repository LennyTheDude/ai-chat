"use client";

import type { CSSProperties } from "react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup";

function mapAuthError(raw: string, mode: AuthMode): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_credentials") ||
    lower.includes("email not confirmed")
  ) {
    return mode === "signin"
      ? "Wrong email or password, or email not confirmed. Try again or reset password in Supabase."
      : raw;
  }
  if (lower.includes("user already registered")) {
    return "An account with this email already exists. Try signing in.";
  }
  if (lower.includes("password")) {
    return raw;
  }
  return raw;
}

const toggleStyle = (active: boolean): CSSProperties => ({
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "0.5rem 0.85rem",
  background: active ? "#171717" : "#fff",
  color: active ? "#fff" : "#171717",
  cursor: "pointer",
  fontSize: "0.9rem",
  fontWeight: active ? 600 : 500,
});

export function AuthForm() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    setStatusIsError(false);

    const credentials = { email: email.trim(), password };
    const result =
      mode === "signup"
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);

    if (result.error) {
      setStatus(mapAuthError(result.error.message, mode));
      setStatusIsError(true);
      setIsSubmitting(false);
      return;
    }

    if (mode === "signup") {
      setStatus("Sign up successful. Check your email for confirmation if required.");
      setStatusIsError(false);
      setIsSubmitting(false);
      return;
    }

    router.push("/chat");
    router.refresh();
  };

  const handleSignOut = async () => {
    setStatus(null);
    setStatusIsError(false);
    const { error } = await supabase.auth.signOut();

    if (error) {
      setStatus(error.message);
      setStatusIsError(true);
      return;
    }

    router.refresh();
    setStatus("Signed out.");
    setStatusIsError(false);
  };

  return (
    <section
      style={{
        maxWidth: 420,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Account</h1>
      <p style={{ color: "var(--muted, #6b7280)", fontSize: "0.95rem", lineHeight: 1.55, margin: 0 }}>
        Use email and password. New users can create an account first, then sign in.
      </p>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setStatus(null);
            setStatusIsError(false);
          }}
          style={toggleStyle(mode === "signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setStatus(null);
            setStatusIsError(false);
          }}
          style={toggleStyle(mode === "signup")}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
          autoComplete="email"
          style={{
            padding: "0.7rem 0.85rem",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            fontSize: "0.95rem",
          }}
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          required
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          style={{
            padding: "0.7rem 0.85rem",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            fontSize: "0.95rem",
          }}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "0.75rem",
            borderRadius: 10,
            border: "1px solid #171717",
            background: isSubmitting ? "#9ca3af" : "#171717",
            color: "#fff",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            fontSize: "0.95rem",
            fontWeight: 600,
          }}
        >
          {isSubmitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleSignOut}
        style={{
          alignSelf: "flex-start",
          border: "none",
          background: "transparent",
          color: "var(--muted, #6b7280)",
          cursor: "pointer",
          fontSize: "0.9rem",
          textDecoration: "underline",
        }}
      >
        Sign out
      </button>

      {status ? (
        <p
          style={{
            fontSize: "0.9rem",
            lineHeight: 1.45,
            color: statusIsError ? "#b91c1c" : "var(--muted, #6b7280)",
            margin: 0,
            padding: "0.65rem 0.75rem",
            borderRadius: 10,
            background: statusIsError ? "#fef2f2" : "#f9fafb",
            border: `1px solid ${statusIsError ? "#fecaca" : "#e5e7eb"}`,
          }}
        >
          {status}
        </p>
      ) : null}
    </section>
  );
}
