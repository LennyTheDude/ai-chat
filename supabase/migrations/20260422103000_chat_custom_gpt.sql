-- Persist selected Custom GPT and app-controlled state per chat.
alter table public.chats
  add column if not exists gpt_id text,
  add column if not exists metadata jsonb;
