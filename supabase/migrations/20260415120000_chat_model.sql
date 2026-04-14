-- Per-chat last model (OpenAI vs Claude). New column backfills existing rows to OpenAI via default.
alter table public.chats
  add column if not exists model text not null default 'openai'
    constraint chats_model_check check (model in ('openai', 'claude'));
