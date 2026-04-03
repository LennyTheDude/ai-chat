Production-style AI chat starter built with Next.js App Router.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.example .env
```

3. Add your values to `.env`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

4. Apply schema in Supabase SQL editor:

- Run `supabase/schema.sql`

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Auth page: [http://localhost:3000/auth](http://localhost:3000/auth)

Chat page (protected): [http://localhost:3000/chat](http://localhost:3000/chat)

## Prompts used for creating this project:

[The ChatGPT conversation](https://chatgpt.com/share/69cf8d19-f8a4-8321-b5d2-ae8960e9e43c) to figure out the project's structure and form the prompt.

[Prompt](./prompts/Prompt.md) - Prompt for the entire app phase-by-phase. Used this prompt in Cursor's "Agent" mode.
