-- ShaPan owns this schema inside the shared appdb database.
create schema if not exists shapan;
create extension if not exists pgcrypto;
set search_path to shapan, public;

create table if not exists shapan.users (
  id text primary key,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shapan.campaign_instances (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null references shapan.users(id),
  campaign_id text not null,
  content_version text not null,
  status text not null check (status in ('running', 'paused', 'won', 'lost', 'finished')),
  clock_minute integer not null,
  objective text not null,
  random_seed uuid not null,
  last_sequence bigint not null default 0,
  next_tick_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table shapan.campaign_instances
  add column if not exists next_tick_at timestamptz not null default now();
create index if not exists campaign_instances_owner_updated_idx
  on shapan.campaign_instances (owner_user_id, updated_at desc);
create index if not exists campaign_instances_due_tick_idx
  on shapan.campaign_instances (next_tick_at) where status = 'running';

create table if not exists shapan.world_events (
  game_id uuid not null references shapan.campaign_instances(id) on delete cascade,
  sequence bigint not null,
  type text not null,
  clock_minute integer not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (game_id, sequence)
);
create index if not exists world_events_game_clock_idx
  on shapan.world_events (game_id, clock_minute, sequence);

create table if not exists shapan.world_snapshots (
  game_id uuid primary key references shapan.campaign_instances(id) on delete cascade,
  sequence bigint not null,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists shapan.belief_snapshots (
  game_id uuid not null references shapan.campaign_instances(id) on delete cascade,
  owner_user_id text not null references shapan.users(id),
  sequence bigint not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  primary key (game_id, owner_user_id, sequence)
);

create table if not exists shapan.orders (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references shapan.campaign_instances(id) on delete cascade,
  owner_user_id text not null references shapan.users(id),
  client_command_id text not null,
  recipient_id text not null,
  channel text not null check (channel in ('radio', 'phone', 'courier', 'underground')),
  text text not null,
  status text not null check (status in ('queued', 'delivered', 'intercepted', 'failed')),
  sent_at_minute integer not null,
  arrive_at_minute integer not null,
  created_at timestamptz not null default now(),
  unique (game_id, client_command_id)
);
create index if not exists orders_due_idx
  on shapan.orders (status, arrive_at_minute);

create table if not exists shapan.messages (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references shapan.campaign_instances(id) on delete cascade,
  owner_user_id text not null references shapan.users(id),
  source text not null,
  message_type text not null,
  subject text not null,
  body text not null,
  sent_at_minute integer,
  delivered_at_minute integer,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists shapan.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references shapan.campaign_instances(id) on delete cascade,
  owner_user_id text not null references shapan.users(id),
  job_type text not null,
  input jsonb not null,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')) default 'queued',
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agent_jobs_claim_idx
  on shapan.agent_jobs (status, available_at);

create table if not exists shapan.agent_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references shapan.agent_jobs(id) on delete cascade,
  provider text,
  model text,
  prompt_version text not null,
  duration_ms integer,
  token_estimate integer,
  result_status text not null,
  structured_output jsonb,
  created_at timestamptz not null default now()
);

create table if not exists shapan.save_points (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references shapan.campaign_instances(id) on delete cascade,
  owner_user_id text not null references shapan.users(id),
  name text not null,
  sequence bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists shapan.after_action_reports (
  game_id uuid primary key references shapan.campaign_instances(id) on delete cascade,
  owner_user_id text not null references shapan.users(id),
  report jsonb not null,
  created_at timestamptz not null default now()
);
