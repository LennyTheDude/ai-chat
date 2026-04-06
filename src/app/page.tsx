import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "4rem 1.25rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>
        AI Chat App
      </h1>
      <p style={{ color: "var(--muted, #6b7280)", lineHeight: 1.6, maxWidth: "42rem" }}>
        Sign in to use chat. Your conversations are stored and streamed with the model you choose.
      </p>
      <div style={{ marginTop: "1.25rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Link href="/auth" style={{ textDecoration: "underline", fontWeight: 500 }}>
          Auth
        </Link>
        <Link href="/chat" style={{ textDecoration: "underline", fontWeight: 500 }}>
          Chat
        </Link>
      </div>
    </main>
  );
}
