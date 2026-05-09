-- Chronicle: Database Schema
-- Run this in your Supabase project's SQL editor (Database > SQL Editor > New query)
-- Supabase Auth handles user accounts automatically — no users table needed.

-- journal_entries table
create table journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  title       text not null,
  content     text not null,
  is_digest   boolean default false,
  created_at  timestamptz default now()
);

-- attachments table (s3_key links to a file in S3)
create table attachments (
  id            uuid primary key default gen_random_uuid(),
  entry_id      uuid references journal_entries on delete cascade not null,
  s3_key        text not null,
  filename      text not null,
  content_type  text not null,
  created_at    timestamptz default now()
);

-- Row-Level Security (users can only see/modify their own data)
alter table journal_entries enable row level security;
create policy "users can manage own entries" on journal_entries
  for all using (user_id = auth.uid());

alter table attachments enable row level security;
create policy "users can manage own attachments" on attachments
  for all using (
    entry_id in (select id from journal_entries where user_id = auth.uid())
  );

-- Index for fast per-user entry listing (newest first)
create index on journal_entries (user_id, created_at desc);
