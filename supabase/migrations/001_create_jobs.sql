-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Jobs table: tracks each transcription request
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'queued'
    check (status in ('queued','downloading','transcribing','completed','failed','cancelled')),
  stage_message text not null default 'Queued…',
  progress_percent integer not null default 0,
  error jsonb,
  result jsonb,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- History table: completed transcriptions for display in sidebar
create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  source_type text not null default 'url',
  source text not null,
  title text not null,
  duration float not null default 0,
  word_count integer not null default 0,
  language text not null default 'unknown',
  created_at timestamptz not null default now()
);

-- Enable Realtime on jobs so the frontend can subscribe to status changes
alter table public.jobs replica identity full;

-- Allow anon to read jobs (they have the job_id to look up their own job)
create policy "Anyone can view jobs" on public.jobs
  for select using (true);

-- Allow anon to insert jobs (to create a new job)
create policy "Anyone can insert jobs" on public.jobs
  for insert with check (true);

-- Allow anon to read history
create policy "Anyone can view history" on public.history
  for select using (true);

-- Allow service role to update/insert (edge functions use service role)
-- (service role bypasses RLS by default)

-- Enable RLS
alter table public.jobs enable row level security;
alter table public.history enable row level security;
