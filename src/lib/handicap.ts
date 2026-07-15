import type { HoleResult, Player, PlayerHoleInfo, Round } from '../types'

export type ScoreMode = 'gross' | 'net'

export function playerGrossScore(hole: HoleResult, player: Player): number | null {
  return player.is_primary ? hole.score : hole.player_scores?.[player.id] ?? null
}

export function playerHoleInfo(hole: HoleResult, player: Player): PlayerHoleInfo {
  if (player.is_primary) return { par: hole.par, yardage: hole.yardage, handicap: hole.hole_handicap }
  return hole.player_hole_info?.[player.id] ?? { par: hole.par, yardage: null, handicap: hole.hole_handicap }
}

export function playerHandicap(round: Round, player: Player): number {
  const value = player.playing_handicap ?? (player.is_primary ? round.playing_handicap : null)
  return Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0
}

export function strokesReceivedOnHole(playingHandicap: number, holeHandicap: number | null, holeCount: number): number {
  if (!playingHandicap || !holeHandicap || holeCount <= 0) return 0
  const strokeIndex = Math.min(Math.max(Math.trunc(holeHandicap), 1), holeCount)
  const absolute = Math.abs(Math.trunc(playingHandicap))
  const base = Math.floor(absolute / holeCount)
  const remainder = absolute % holeCount

  if (playingHandicap > 0) return base + (strokeIndex <= remainder ? 1 : 0)

  // Plus handicaps give strokes back beginning with the highest stroke-index holes.
  return -(base + (remainder > 0 && strokeIndex > holeCount - remainder ? 1 : 0))
}

export function displayedHoleScore(round: Round, hole: HoleResult, player: Player, mode: ScoreMode, holeCount: number): number | null {
  const gross = playerGrossScore(hole, player)
  if (gross == null || mode === 'gross') return gross
  const info = playerHoleInfo(hole, player)
  return gross - strokesReceivedOnHole(playerHandicap(round, player), info.handicap, holeCount)
}

export function displayedHoleToPar(round: Round, hole: HoleResult, player: Player, mode: ScoreMode, holeCount: number): number | null {
  const score = displayedHoleScore(round, hole, player, mode, holeCount)
  const par = playerHoleInfo(hole, player).par
  return score == null || par == null ? null : score - par
}

export function playerRoundTotals(round: Round, holes: HoleResult[], player: Player, mode: ScoreMode) {
  const completed = holes.filter((hole) => playerGrossScore(hole, player) != null)
  const score = completed.reduce((sum, hole) => sum + Number(displayedHoleScore(round, hole, player, mode, holes.length) ?? 0), 0)
  const par = completed.reduce((sum, hole) => sum + Number(playerHoleInfo(hole, player).par ?? 0), 0)
  return {
    completed: completed.length,
    score: completed.length ? score : null,
    par: completed.length ? par : null,
    toPar: completed.length ? score - par : null,
  }
}
