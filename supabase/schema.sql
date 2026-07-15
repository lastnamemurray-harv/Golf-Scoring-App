-- Run this entire file in Supabase SQL Editor.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  course_key text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  layout text not null default '',
  city text not null default '',
  address text not null default '',
  access text not null default '',
  hole_count integer not null default 18,
  default_tee text not null default '',
  course_par integer,
  total_yardage integer,
  rating numeric,
  slope integer,
  data_coverage text not null default 'Profile only',
  source_url text not null default '',
  notes text not null default '',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, course_key)
);

create table if not exists public.course_tees (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  course_key text not null,
  tee_name text not null,
  par integer,
  total_yardage integer,
  rating numeric,
  slope integer check (slope between 55 and 155),
  is_default boolean not null default false,
  source_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, tee_name)
);

create table if not exists public.course_holes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  course_key text not null,
  tee_name text not null,
  hole_number integer not null check (hole_number between 1 and 36),
  par integer check (par between 2 and 7),
  yardage integer check (yardage between 20 and 1000),
  handicap integer check (handicap between 1 and 36),
  source_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, tee_name, hole_number)
);

create table if not exists public.rounds (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  course_key text not null,
  course_name text not null,
  layout text not null default '',
  tee_name text not null default '',
  tee_par integer,
  tee_yardage integer,
  course_rating numeric,
  course_slope integer,
  date date not null default current_date,
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null check (status in ('in_progress','complete')),
  playing_handicap numeric,
  target_score integer,
  primary_focus text not null default '',
  tracking_config jsonb not null default '{}'::jsonb,
  players jsonb not null default '[{"id":"primary","name":"You","is_primary":true}]'::jsonb,
  total_score integer,
  to_par integer,
  method_pct numeric,
  scoring_zone_pct numeric,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hole_results (
  id uuid primary key,
  round_id uuid not null references public.rounds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hole_number integer not null check (hole_number between 1 and 36),
  par integer,
  yardage integer,
  hole_handicap integer,
  entering_zone_target integer,
  entering_zone_actual integer,
  entering_zone_point integer check (entering_zone_point in (0,1)),
  down_zone_target integer not null default 3,
  down_zone_actual integer,
  down_zone_point integer check (down_zone_point in (0,1)),
  score integer,
  player_scores jsonb not null default '{}'::jsonb,
  putts integer,
  inside_4ft_result text not null default '',
  made_putt_length_ft numeric,
  penalty_strokes integer not null default 0,
  tee_result text not null default '',
  club_used_off_tee text not null default '',
  gir text not null default '',
  chips_pitches integer,
  up_down text not null default '',
  plan integer check (plan in (0,1)),
  routine integer check (routine in (0,1)),
  commit integer check (commit in (0,1)),
  smart_decision integer check (smart_decision in (0,1)),
  reset integer check (reset in (0,1)),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_id, hole_number)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  metric_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger courses_updated_at before update on public.courses for each row execute function public.set_updated_at();
create trigger course_tees_updated_at before update on public.course_tees for each row execute function public.set_updated_at();
create trigger course_holes_updated_at before update on public.course_holes for each row execute function public.set_updated_at();
create trigger rounds_updated_at before update on public.rounds for each row execute function public.set_updated_at();
create trigger hole_results_updated_at before update on public.hole_results for each row execute function public.set_updated_at();
create trigger user_settings_updated_at before update on public.user_settings for each row execute function public.set_updated_at();

alter table public.courses enable row level security;
alter table public.course_tees enable row level security;
alter table public.course_holes enable row level security;
alter table public.rounds enable row level security;
alter table public.hole_results enable row level security;
alter table public.user_settings enable row level security;

create policy "Read public or owned courses" on public.courses for select using (is_public or owner_id = auth.uid());
create policy "Insert owned courses" on public.courses for insert with check (owner_id = auth.uid());
create policy "Update owned courses" on public.courses for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Delete owned courses" on public.courses for delete using (owner_id = auth.uid());

create policy "Read public or owned course tees" on public.course_tees for select using (
  exists (select 1 from public.courses c where c.id = course_id and (c.is_public or c.owner_id = auth.uid()))
);
create policy "Insert owned course tees" on public.course_tees for insert with check (
  owner_id = auth.uid() and exists (select 1 from public.courses c where c.id = course_id and c.owner_id = auth.uid())
);
create policy "Update owned course tees" on public.course_tees for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Delete owned course tees" on public.course_tees for delete using (owner_id = auth.uid());

create policy "Read public or owned course holes" on public.course_holes for select using (
  exists (select 1 from public.courses c where c.id = course_id and (c.is_public or c.owner_id = auth.uid()))
);
create policy "Insert owned course holes" on public.course_holes for insert with check (
  owner_id = auth.uid() and exists (select 1 from public.courses c where c.id = course_id and c.owner_id = auth.uid())
);
create policy "Update owned course holes" on public.course_holes for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Delete owned course holes" on public.course_holes for delete using (owner_id = auth.uid());

create policy "Users manage own rounds" on public.rounds for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage own hole results" on public.hole_results for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage own settings" on public.user_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
