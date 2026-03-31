Production-style AI chat starter built with Next.js App Router.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.local.example .env.local
```

3. Add your Supabase project values to `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Apply schema in Supabase SQL editor:

- Run `supabase/schema.sql`

## Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

Auth page: [http://localhost:3000/auth](http://localhost:3000/auth)

Chat page (protected): [http://localhost:3000/chat](http://localhost:3000/chat)
