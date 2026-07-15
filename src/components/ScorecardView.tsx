import { useMemo, useState } from 'react'
import type { HoleResult, Player, Round } from '../types'
import { analyzeRound, formatPercent, formatToPar } from '../lib/analytics'
import BrandMark from './BrandMark'

interface Props {
  round: Round
  holes: HoleResult[]
  active: boolean
  onBack: () => void
  onHome: () => void
  onSelectHole?: (index: number) => void
  onDelete: () => void
  onAnalytics?: () => void
}

function relativeLabel(score: number | null, par: number | null): string {
  if (score == null || par == null) return '—'
  return formatToPar(score - par)
}

function playerScore(hole: HoleResult, player: Player): number | null {
  return player.is_primary ? hole.score : hole.player_scores?.[player.id] ?? null
}

function SummaryStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="summary-stat"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

export default function ScorecardView({ round, holes, active, onBack, onHome, onSelectHole, onDelete, onAnalytics }: Props) {
  const [view, setView] = useState<'summary' | 'simple' | 'detailed'>(round.status === 'complete' ? 'summary' : 'simple')
  const settings = round.tracking_config
  const players = round.players
  const analysis = useMemo(() => analyzeRound(round, holes), [round, holes])

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
      <header className="scorecard-header">
        <BrandMark compact />
        <div>
          <p className="eyebrow">{round.status === 'complete' ? 'Round complete' : `${completedHoles}/${holes.length} holes scored`}</p>
          <h1>{round.course_name}</h1>
          <p className="lead">{round.date} · {round.tee_name}</p>
        </div>
      </header>

      <div className="view-toggle three-view-toggle" role="group" aria-label="Scorecard view">
        <button type="button" className={view === 'summary' ? 'active' : ''} onClick={() => setView('summary')}>Summary</button>
        <button type="button" className={view === 'simple' ? 'active' : ''} onClick={() => setView('simple')}>Scores</button>
        <button type="button" className={view === 'detailed' ? 'active' : ''} onClick={() => setView('detailed')}>Details</button>
      </div>

      {view === 'summary' && <section className="round-summary stack">
        <article className="round-score-hero">
          <div><p className="eyebrow">Round score</p><strong>{analysis.totalScore ?? '—'}</strong><span>{formatToPar(analysis.toPar)}</span></div>
          <div className="round-score-meta"><span>{analysis.completedHoles} holes</span><span>Par {analysis.totalPar ?? '—'}</span><span>{round.players.length} player{round.players.length === 1 ? '' : 's'}</span></div>
        </article>

        <section className="summary-stat-grid">
          <SummaryStat label="Fairways" value={formatPercent(analysis.fairways.rate)} detail={`${analysis.fairways.made}/${analysis.fairways.attempts} tracked`} />
          <SummaryStat label="GIR" value={formatPercent(analysis.gir.rate)} detail={`${analysis.gir.made}/${analysis.gir.attempts}`} />
          <SummaryStat label="Putts" value={analysis.totalPutts ? String(analysis.totalPutts) : '—'} detail={analysis.averagePutts == null ? 'No data' : `${analysis.averagePutts.toFixed(2)} per hole`} />
          <SummaryStat label="Scoring zone" value={formatPercent(analysis.scoringZone.rate)} detail={`${analysis.scoringZone.made}/${analysis.scoringZone.attempts} points`} />
          <SummaryStat label="Method" value={formatPercent(analysis.method.rate)} detail="Process score" />
          <SummaryStat label="Damage events" value={String(analysis.damageEvents)} detail={`${analysis.penalties} penalties · ${analysis.threePutts} three-putts`} />
        </section>

        <section className="card score-distribution-strip">
          <div><span>Birdie+</span><strong>{analysis.birdiesOrBetter}</strong></div>
          <div><span>Par</span><strong>{analysis.pars}</strong></div>
          <div><span>Bogey</span><strong>{analysis.bogeys}</strong></div>
          <div><span>Double</span><strong>{analysis.doubles}</strong></div>
          <div><span>Triple+</span><strong>{analysis.triplesPlus}</strong></div>
        </section>

        <section className="insight-pair round-insights">
          <article className="insight-card good"><span className="insight-icon">✓</span><div><p className="eyebrow">What went well</p>{analysis.strengths.length ? analysis.strengths.map((insight) => <div className="insight-list-item" key={insight.title}><h3>{insight.title}</h3><p>{insight.detail}</p></div>) : <p>Complete more tracked metrics to identify strengths.</p>}</div></article>
          <article className="insight-card warning"><span className="insight-icon">!</span><div><p className="eyebrow">What cost strokes</p>{analysis.opportunities.length ? analysis.opportunities.map((insight) => <div className="insight-list-item" key={insight.title}><h3>{insight.title}</h3><p>{insight.detail}</p></div>) : <p>No major scoring leaks were identified in the tracked data.</p>}</div></article>
        </section>

        <section className="card next-focus-card">
          <p className="eyebrow">Next-round priority</p>
          <h2>{analysis.nextFocus.title}</h2>
          <p>{analysis.nextFocus.detail}</p>
        </section>

        {(analysis.bestHole || analysis.worstHole) && <section className="highlight-holes">
          {analysis.bestHole && <article className="card"><p className="eyebrow">Best hole</p><h2>Hole {analysis.bestHole.hole_number}</h2><strong>{analysis.bestHole.score} on par {analysis.bestHole.par}</strong><span>{relativeLabel(analysis.bestHole.score, analysis.bestHole.par)}</span></article>}
          {analysis.worstHole && <article className="card"><p className="eyebrow">Costliest hole</p><h2>Hole {analysis.worstHole.hole_number}</h2><strong>{analysis.worstHole.score} on par {analysis.worstHole.par}</strong><span>{relativeLabel(analysis.worstHole.score, analysis.worstHole.par)}</span></article>}
        </section>}

        {onAnalytics && round.status === 'complete' && <button type="button" className="secondary large" onClick={onAnalytics}>View performance analytics →</button>}
      </section>}

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
            <tfoot><tr><th>Total</th><td>{holes.reduce((sum, hole) => sum + Number(hole.par ?? 0), 0) || '—'}</td>{totals.map(({ player, score, toPar }) => <td key={player.id}><strong>{score ?? '—'}</strong><small>{formatToPar(toPar)}</small></td>)}</tr></tfoot>
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
