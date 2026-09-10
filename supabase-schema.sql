-- Run this once in Supabase SQL Editor.
create table if not exists public.log_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.log_data enable row level security;

drop policy if exists "Users can read their own log" on public.log_data;
create policy "Users can read their own log"
  on public.log_data for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own log" on public.log_data;
create policy "Users can create their own log"
  on public.log_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own log" on public.log_data;
create policy "Users can update their own log"
  on public.log_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
