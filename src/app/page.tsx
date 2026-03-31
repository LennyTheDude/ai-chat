import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1.25rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>AI Chat App</h1>
      <p style={{ color: "#666", lineHeight: 1.6 }}>
        Starter homepage is ready. Next phases will add the chat interface,
        authentication, and persistence.
      </p>
      <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
        <Link href="/auth" style={{ textDecoration: "underline" }}>
          Auth
        </Link>
        <Link href="/chat" style={{ textDecoration: "underline" }}>
          Chat
        </Link>
      </div>
    </main>
  );
}
