import { useMemo, useState } from 'react'
import type { HoleResult, Player, Round } from '../types'

interface Props {
  round: Round
  holes: HoleResult[]
  active: boolean
  onBack: () => void
  onHome: () => void
  onSelectHole?: (index: number) => void
  onDelete: () => void
}

function relativeLabel(score: number | null, par: number | null): string {
  if (score == null || par == null) return '—'
  const value = score - par
  if (value === 0) return 'E'
  return value > 0 ? `+${value}` : String(value)
}

function playerScore(hole: HoleResult, player: Player): number | null {
  return player.is_primary ? hole.score : hole.player_scores?.[player.id] ?? null
}

export default function ScorecardView({ round, holes, active, onBack, onHome, onSelectHole, onDelete }: Props) {
  const [view, setView] = useState<'simple' | 'detailed'>('simple')
  const settings = round.tracking_config
  const players = round.players

  const totals = useMemo(() => players.map((player) => {
    const completed = holes.filter((hole) => playerScore(hole, player) != null && hole.par != null)
    const score = completed.reduce((sum, hole) => sum + Number(playerScore(hole, player)), 0)
    const par = completed.reduce((sum, hole) => sum + Number(hole.par), 0)
    return { player, score: completed.length ? score : null, toPar: completed.length ? score - par : null }
  }), [holes, players])

  const completedHoles = holes.filter((hole) => hole.score != null).length

  return (
    <main className="page stack scorecard-page">
      <div className="round-toolbar">
        <button type="button" className="secondary compact-button" onClick={onBack}>{active ? '← Back to hole' : '← Back'}</button>
        <button type="button" className="secondary compact-button" onClick={onHome}>⌂ Home</button>
      </div>
      <header>
        <p className="eyebrow">{round.status === 'complete' ? 'Completed round' : `${completedHoles}/${holes.length} holes scored`}</p>
        <h1>{round.course_name}</h1>
        <p className="lead">{round.date} · {round.tee_name}</p>
      </header>

      <div className="view-toggle" role="group" aria-label="Scorecard view">
        <button type="button" className={view === 'simple' ? 'active' : ''} onClick={() => setView('simple')}>Simplified</button>
        <button type="button" className={view === 'detailed' ? 'active' : ''} onClick={() => setView('detailed')}>Detailed</button>
      </div>

      {view === 'simple' && <section className="card scorecard-table-card">
        <div className="scorecard-scroll">
          <table className="scorecard-table">
            <thead><tr><th>Hole</th><th>Par</th>{players.map((player) => <th key={player.id}>{player.name}</th>)}</tr></thead>
            <tbody>
              {holes.map((hole, index) => <tr key={hole.id} className={onSelectHole ? 'selectable-row' : ''} onClick={() => onSelectHole?.(index)}>
                <th>{hole.hole_number}</th>
                <td>{hole.par ?? '—'}</td>
                {players.map((player) => {
                  const score = playerScore(hole, player)
                  return <td key={player.id}><strong>{score ?? '—'}</strong><small>{relativeLabel(score, hole.par)}</small></td>
                })}
              </tr>)}
            </tbody>
            <tfoot><tr><th>Total</th><td>{holes.reduce((sum, hole) => sum + Number(hole.par ?? 0), 0) || '—'}</td>{totals.map(({ player, score, toPar }) => <td key={player.id}><strong>{score ?? '—'}</strong><small>{toPar == null ? '—' : toPar === 0 ? 'E' : toPar > 0 ? `+${toPar}` : toPar}</small></td>)}</tr></tfoot>
          </table>
        </div>
        {onSelectHole && <p className="muted compact table-hint">Tap a hole row to return to that hole.</p>}
      </section>}

      {view === 'detailed' && <section className="detail-scorecard stack">
        {holes.map((hole, index) => {
          const methodValues = [hole.plan, hole.routine, hole.commit, hole.smart_decision, hole.reset].filter((value) => value != null)
          const methodScore = methodValues.reduce<number>((sum, value) => sum + Number(value), 0)
          const guestPlayers = players.filter((player) => !player.is_primary)
          return <article className="card detail-hole-card" key={hole.id} onClick={() => onSelectHole?.(index)}>
            <div className="detail-hole-heading">
              <div><p className="eyebrow">Hole {hole.hole_number}</p><h2>Par {hole.par ?? '—'} · {hole.score ?? '—'} strokes</h2></div>
              <span className="relative-score">{relativeLabel(hole.score, hole.par)}</span>
            </div>

            {guestPlayers.length > 0 && <div className="detail-stat-grid guest-summary">
              {guestPlayers.map((player) => <div className="detail-stat" key={player.id}><span>{player.name}</span><strong>{hole.player_scores?.[player.id] ?? '—'}</strong></div>)}
            </div>}

            <div className="detail-stat-grid">
              {settings.courseDetails && <><div className="detail-stat"><span>Yards</span><strong>{hole.yardage ?? '—'}</strong></div><div className="detail-stat"><span>HCP</span><strong>{hole.hole_handicap ?? '—'}</strong></div></>}
              {settings.teeClub && <div className="detail-stat"><span>Tee club</span><strong>{hole.club_used_off_tee || '—'}</strong></div>}
              {settings.teeResult && <div className="detail-stat"><span>Tee result</span><strong>{hole.tee_result || '—'}</strong></div>}
              {settings.scoringZone && <><div className="detail-stat"><span>Enter zone</span><strong>{hole.entering_zone_actual ?? '—'} / {hole.entering_zone_target ?? '—'} · {hole.entering_zone_point ?? '—'} pt</strong></div><div className="detail-stat"><span>Down in zone</span><strong>{hole.down_zone_actual ?? '—'} / 3 · {hole.down_zone_point ?? '—'} pt</strong></div></>}
              {settings.gir && <div className="detail-stat"><span>GIR</span><strong>{hole.gir || '—'}</strong></div>}
              {settings.shortGame && <><div className="detail-stat"><span>Chips / pitches</span><strong>{hole.chips_pitches ?? '—'}</strong></div><div className="detail-stat"><span>Up & down</span><strong>{hole.up_down || '—'}</strong></div></>}
              {settings.putting && <div className="detail-stat"><span>Putts</span><strong>{hole.putts ?? '—'}</strong></div>}
              {settings.inside4ft && <div className="detail-stat"><span>Inside 4 ft</span><strong>{hole.inside_4ft_result || '—'}</strong></div>}
              {settings.madePuttLength && <div className="detail-stat"><span>Made putt</span><strong>{hole.made_putt_length_ft == null ? '—' : `${hole.made_putt_length_ft} ft`}</strong></div>}
              {settings.penalties && <div className="detail-stat"><span>Penalties</span><strong>{hole.penalty_strokes}</strong></div>}
              {settings.methodScore && <div className="detail-stat wide"><span>Method score</span><strong>{methodValues.length ? `${methodScore}/${methodValues.length}` : '—'}</strong><small>Plan {hole.plan ?? '—'} · Routine {hole.routine ?? '—'} · Commit {hole.commit ?? '—'} · Smart {hole.smart_decision ?? '—'} · Reset {hole.reset ?? '—'}</small></div>}
              {settings.notes && hole.notes && <div className="detail-stat wide"><span>Notes</span><strong>{hole.notes}</strong></div>}
            </div>
          </article>
        })}
      </section>}

      <button type="button" className="danger-button" onClick={onDelete}>Delete this round</button>
    </main>
  )
}
