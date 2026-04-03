You are a senior fullstack engineer. Help me build a production-style AI chat web app step by step.

Tech stack:

* Next.js (App Router, TypeScript)
* Supabase (DB + Auth)
* Vercel AI SDK (but DO NOT implement AI until the final phase)

IMPORTANT RULES:

* Implement ONLY the current phase
* Do NOT skip ahead
* Keep code clean and minimal
* Use good folder structure
* Add brief comments explaining decisions
* After finishing a phase, STOP and wait for my confirmation

---

# PHASE 0 — Project setup

Goal: Initialize the project

Tasks:

* Create a Next.js app (App Router, TypeScript)
* Set up basic folder structure:
  /app
  /components
  /lib
* Add a simple homepage
* Add a basic layout

Do NOT:

* Add Supabase yet
* Add any chat logic

---

# PHASE 1 — UI skeleton (no backend)

Goal: Build chat UI without real data

Tasks:

* Create chat page `/chat`
* Build components:

  * Chat container
  * Message list
  * Message input
  * Model selector (dropdown: OpenAI / Claude)
* Use local React state (mock messages)

Behavior:

* User can type message
* Message appears in UI
* Fake assistant response (hardcoded)

Do NOT:

* Add API routes
* Add Supabase
* Add AI SDK

---

# PHASE 2 — Supabase setup

Goal: Add database and auth

Tasks:

* Install Supabase client
* Create `lib/supabase.ts`
* Set up environment variables

Database schema:

* chats (id, user_id, title, created_at)
* messages (id, chat_id, role, content, created_at)
* usage (user_id, requests_count, tokens_used)

Auth:

* Implement:

  * sign up
  * sign in
  * sign out
* Protect `/chat` route (redirect if not logged in)

Do NOT:

* Connect chat UI to DB yet
* Do NOT implement AI

---

# PHASE 3 — Persist chat data

Goal: Connect UI to database

Tasks:

* Create API routes:

  * POST /api/chats → create chat
  * GET /api/chats → list user chats
  * GET /api/chats/:id → get messages
  * POST /api/messages → save message

* Connect frontend to API:

  * On new chat → create in DB
  * On message send → save message
  * Load chat history from DB

Behavior:

* Chats persist after refresh
* Sidebar with chat list (simple)

Do NOT:

* Add AI responses
* No streaming yet

---

# PHASE 4 — Usage limits

Goal: Add basic rate limiting

Tasks:

* On each message:

  * increment `requests_count`
* Add limit (e.g. 100 requests per user)

Behavior:

* If limit exceeded → return error
* Show error in UI

Keep it simple (no token counting yet)

---

# PHASE 5 — Prepare AI integration (NO implementation yet)

Goal: Prepare abstraction layer

Tasks:

* Create `lib/ai.ts`

* Define:

  * model enum (openai | claude)
  * function `getModel(model)`

* Modify API:

  * `/api/chat` endpoint (stub only)
  * Accept:

    * messages
    * model

Return:

* mock response for now

Do NOT:

* Call real AI
* Do NOT install Vercel AI SDK yet

---

# PHASE 6 — Streaming-ready API structure

Goal: Prepare for streaming

Tasks:

* Refactor `/api/chat` to:

  * return a streaming response (mock stream)
* Update frontend:

  * handle streaming text updates

Simulate streaming:

* send response chunk-by-chunk with delays

Do NOT:

* Use real AI yet

---

# PHASE 7 — AI integration (FINAL PHASE)

Goal: Integrate Vercel AI SDK

Tasks:

* Install Vercel AI SDK
* Implement real streaming:

  * OpenAI model
  * Claude model
* Replace mock logic with real AI calls

Requirements:

* Use streaming (`streamText`)
* Save assistant message after completion
* Update usage (requests + tokens if possible)

---

# PHASE 8 — Polish

Goal: Improve UX

Tasks:

* Loading states
* Error handling
* Empty states
* Basic styling improvements

---

Start with PHASE 0.
