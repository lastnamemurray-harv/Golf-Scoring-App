-- RoundWise v0.6: preserve per-player tee hole information for gross/net scorecards.
-- Player tee and handicap fields are stored inside rounds.players JSONB and need no new column.

alter table public.hole_results
  add column if not exists player_hole_info jsonb not null default '{}'::jsonb;

update public.hole_results
set player_hole_info = '{}'::jsonb
where player_hole_info is null or jsonb_typeof(player_hole_info) <> 'object';

comment on column public.hole_results.player_hole_info is
  'Per-player hole par, yardage, and stroke index snapshots keyed by player UUID.';
