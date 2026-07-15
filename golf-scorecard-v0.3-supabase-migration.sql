-- Run this once in the Supabase SQL Editor before deploying app version 0.3.0.
-- It is safe to run more than once.

alter table public.rounds
  add column if not exists players jsonb not null
  default '[{"id":"primary","name":"You","is_primary":true}]'::jsonb;

alter table public.hole_results
  add column if not exists player_scores jsonb not null default '{}'::jsonb;

-- Backfill any rows created before these columns existed.
update public.rounds
set players = '[{"id":"primary","name":"You","is_primary":true}]'::jsonb
where players is null or jsonb_typeof(players) <> 'array';

update public.hole_results
set player_scores = '{}'::jsonb
where player_scores is null or jsonb_typeof(player_scores) <> 'object';
