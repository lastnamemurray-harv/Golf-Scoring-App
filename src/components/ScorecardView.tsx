import { useMemo, useState, type ReactNode } from 'react'
import type { HoleResult, Player, Round } from '../types'
import { analyzeRound, formatPercent, formatToPar } from '../lib/analytics'
import { displayedHoleScore, displayedHoleToPar, playerGrossScore, playerHandicap, playerHoleInfo, playerRoundTotals, strokesReceivedOnHole, type ScoreMode } from '../lib/handicap'
import BrandMark from './BrandMark'
import ScoreSymbol from './ScoreSymbol'

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

function relativeLabel(relative: number | null): string { return formatToPar(relative) }

function SummaryStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="summary-stat"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function rateDetail(made: number, attempts: number): string { return attempts ? `${made}/${attempts} earned` : 'No data' }

function pointStatus(value: number | null): ReactNode {
  return <span className={`detail-status ${value === 1 ? 'detail-good' : value === 0 ? 'detail-bad' : ''}`}>{value == null ? '—' : value}</span>
}
function yesNoStatus(value: string): ReactNode {
  return <span className={`detail-status ${value === 'Yes' ? 'detail-good' : value === 'No' ? 'detail-bad' : ''}`}>{value || '—'}</span>
}
function puttStatus(value: number | null): ReactNode {
  return <span className={`detail-status ${value != null && value >= 3 ? 'detail-bad' : ''}`}>{value ?? '—'}</span>
}

export default function ScorecardView({ round, holes, active, onBack, onHome, onSelectHole, onDelete, onAnalytics }: Props) {
  const [view, setView] = useState<'summary' | 'simple' | 'detailed'>(round.status === 'complete' ? 'summary' : 'simple')
  const [scoreMode, setScoreMode] = useState<ScoreMode>('gross')
  const [detailsMode, setDetailsMode] = useState<'cards' | 'matrix'>('matrix')
  const settings = round.tracking_config
  const players = round.players
  const primary = players.find((player) => player.is_primary) ?? players[0]
  const analysis = useMemo(() => analyzeRound(round, holes), [round, holes])
  const teeResultTotal = analysis.teeResults.reduce((sum, item) => sum + item.value, 0)
  const totals = useMemo(() => players.map((player) => ({ player, ...playerRoundTotals(round, holes, player, scoreMode) })), [holes, players, round, scoreMode])
  const primaryTotals = totals.find(({ player }) => player.id === primary?.id)
  const completedHoles = holes.filter((hole) => hole.score != null).length

  function scoreFor(hole: HoleResult, player: Player) { return displayedHoleScore(round, hole, player, scoreMode, holes.length) }
  function relativeFor(hole: HoleResult, player: Player) { return displayedHoleToPar(round, hole, player, scoreMode, holes.length) }

  const matrixRows = useMemo(() => {
    const rows: Array<{ label: string; values: (hole: HoleResult) => ReactNode }> = [
      { label: 'Par', values: (hole) => playerHoleInfo(hole, primary).par ?? '—' },
      { label: `${scoreMode === 'gross' ? 'Gross' : 'Net'} score`, values: (hole) => <ScoreSymbol compact score={scoreFor(hole, primary)} relative={relativeFor(hole, primary)} /> },
      { label: 'To par', values: (hole) => relativeLabel(relativeFor(hole, primary)) },
    ]
    players.filter((player) => !player.is_primary).forEach((player) => rows.push({
      label: `${player.name} ${scoreMode === 'gross' ? 'score' : 'net'}`,
      values: (hole) => <ScoreSymbol compact score={scoreFor(hole, player)} relative={relativeFor(hole, player)} />,
    }))
    if (settings.courseDetails) rows.push(
      { label: 'Yards', values: (hole) => hole.yardage ?? '—' },
      { label: 'Hole HCP', values: (hole) => hole.hole_handicap ?? '—' },
    )
    if (scoreMode === 'net') rows.push({ label: 'HCP strokes', values: (hole) => strokesReceivedOnHole(playerHandicap(round, primary), hole.hole_handicap, holes.length) || '—' })
    if (settings.teeClub) rows.push({ label: 'Tee club', values: (hole) => hole.club_used_off_tee || '—' })
    if (settings.teeResult) rows.push({ label: 'Tee result', values: (hole) => hole.tee_result || '—' })
    if (settings.scoringZone) rows.push(
      { label: 'Enter target', values: (hole) => hole.entering_zone_target ?? '—' },
      { label: 'Enter actual', values: (hole) => hole.entering_zone_actual ?? '—' },
      { label: 'Down actual', values: (hole) => hole.down_zone_actual ?? '—' },
    )
    if (settings.shortGame) rows.push({ label: 'Chips / pitches', values: (hole) => hole.chips_pitches ?? '—' })
    if (settings.putting) rows.push({ label: 'Putts', values: (hole) => puttStatus(hole.putts) })
    if (settings.inside4ft) rows.push({ label: 'Inside 4 ft', values: (hole) => hole.inside_4ft_result || '—' })
    if (settings.madePuttLength) rows.push({ label: 'Made putt (ft)', values: (hole) => hole.made_putt_length_ft ?? '—' })
    if (settings.penalties) rows.push({ label: 'Penalties', values: (hole) => hole.penalty_strokes || '—' })
    if (settings.methodScore) rows.push(
      { label: 'Plan', values: (hole) => hole.plan ?? '—' },
      { label: 'Routine', values: (hole) => hole.routine ?? '—' },
      { label: 'Commit', values: (hole) => hole.commit ?? '—' },
      { label: 'Smart decision', values: (hole) => hole.smart_decision ?? '—' },
      { label: 'Reset', values: (hole) => hole.reset ?? '—' },
    )
    if (settings.notes) rows.push({ label: 'Notes', values: (hole) => hole.notes || '—' })
    if (settings.scoringZone) rows.push(
      { label: 'Enter point', values: (hole) => pointStatus(hole.entering_zone_point) },
      { label: 'Down point', values: (hole) => pointStatus(hole.down_zone_point) },
    )
    if (settings.gir) rows.push({ label: 'GIR', values: (hole) => yesNoStatus(hole.gir) })
    if (settings.shortGame) rows.push({ label: 'Up & down', values: (hole) => yesNoStatus(hole.up_down) })
    return rows
  }, [holes.length, players, primary, round, scoreMode, settings])

  return (
    <main className="page stack scorecard-page">
      <div className="round-toolbar">
        <button type="button" className="secondary compact-button" onClick={onBack}>{active ? '← Back to hole' : '← Back'}</button>
        <button type="button" className="secondary compact-button" onClick={onHome}>⌂ Home</button>
      </div>

      <section className="scorecard-identity">
        <div className="scorecard-title-row"><BrandMark iconOnly /><div><p className="eyebrow">{round.status === 'complete' ? 'Round complete' : 'Round in progress'}</p><h1>{round.course_name}</h1></div></div>
        <div className="scorecard-meta-row">
          <span>{completedHoles}/{holes.length} holes scored</span><span>{round.date}</span><span>{round.layout}</span>
          {players.map((player) => <span key={player.id}>{player.name}: {player.tee_name || round.tee_name} · HCP {playerHandicap(round, player)}</span>)}
          {round.course_rating != null && round.course_slope != null && <span>Rating/Slope {round.course_rating}/{round.course_slope}</span>}
        </div>
      </section>

      <div className="scorecard-control-row">
        <div className="view-toggle three-view-toggle" role="group" aria-label="Scorecard view">
          <button type="button" className={view === 'summary' ? 'active' : ''} onClick={() => setView('summary')}>Summary</button>
          <button type="button" className={view === 'simple' ? 'active' : ''} onClick={() => setView('simple')}>Scores</button>
          <button type="button" className={view === 'detailed' ? 'active' : ''} onClick={() => setView('detailed')}>Details</button>
        </div>
        <div className="gross-net-toggle" role="group" aria-label="Gross or net score">
          <button type="button" className={scoreMode === 'gross' ? 'active' : ''} onClick={() => setScoreMode('gross')}>Gross</button>
          <button type="button" className={scoreMode === 'net' ? 'active' : ''} onClick={() => setScoreMode('net')}>Net</button>
        </div>
      </div>

      {view === 'summary' && <section className="round-summary stack">
        <article className="round-score-hero">
          <div><p className="eyebrow">{scoreMode === 'gross' ? 'Gross' : 'Net'} round score</p><strong>{primaryTotals?.score ?? '—'}</strong><span>{formatToPar(primaryTotals?.toPar ?? null)}</span></div>
          <div className="round-score-meta"><span>{analysis.completedHoles} holes</span><span>Par {primaryTotals?.par ?? '—'}</span><span>{round.players.length} player{round.players.length === 1 ? '' : 's'}</span></div>
        </article>

        <section className="summary-stat-grid expanded-summary-grid">
          <SummaryStat label="Fairways" value={formatPercent(analysis.fairways.rate)} detail={`${analysis.fairways.made}/${analysis.fairways.attempts} tracked`} />
          <SummaryStat label="GIR" value={formatPercent(analysis.gir.rate)} detail={`${analysis.gir.made}/${analysis.gir.attempts}`} />
          <SummaryStat label="Up & down" value={formatPercent(analysis.upDown.rate)} detail={`${analysis.upDown.made}/${analysis.upDown.attempts}`} />
          <SummaryStat label="Putts" value={analysis.puttingHoles ? String(analysis.totalPutts) : '—'} detail={analysis.averagePutts == null ? 'No data' : `${analysis.averagePutts.toFixed(2)} per hole`} />
          <SummaryStat label="Feet of putts" value={analysis.totalMadePuttFeet ? `${analysis.totalMadePuttFeet.toFixed(1)} ft` : '—'} detail={analysis.longestPutt == null ? 'No putt lengths' : `Longest ${analysis.longestPutt} ft`} />
          <SummaryStat label="Inside 4 ft" value={formatPercent(analysis.inside4ft.rate)} detail={`${analysis.inside4ft.made}/${analysis.inside4ft.attempts}`} />
          <SummaryStat label="Entering zone" value={formatPercent(analysis.enteringZone.rate)} detail={rateDetail(analysis.enteringZone.made, analysis.enteringZone.attempts)} />
          <SummaryStat label="Down in zone" value={formatPercent(analysis.downZone.rate)} detail={rateDetail(analysis.downZone.made, analysis.downZone.attempts)} />
          <SummaryStat label="Damage events" value={String(analysis.damageEvents)} detail={`${analysis.penalties} penalties · ${analysis.threePutts} three-putts`} />
        </section>

        {settings.methodScore && <section className="card method-summary-card">
          <div className="section-title"><div><p className="eyebrow">Method summary</p><h2>Five process checks</h2></div><strong>{formatPercent(analysis.method.rate)}</strong></div>
          <div className="method-five-grid">{Object.entries(analysis.methodCategories).map(([label, stat]) => <div key={label}><span>{label}</span><strong>{formatPercent(stat.rate)}</strong><small>{stat.made}/{stat.attempts}</small></div>)}</div>
        </section>}

        {settings.teeResult && <section className="card">
          <div className="section-title"><div><p className="eyebrow">Off the tee</p><h2>Tee-shot results</h2></div><span className="gold-chip">{teeResultTotal} tracked</span></div>
          {analysis.teeResults.length ? <div className="tee-result-summary">{analysis.teeResults.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{teeResultTotal ? `${Math.round(item.value / teeResultTotal * 100)}%` : '—'}</small></div>)}</div> : <p className="muted">No tee-shot results were recorded.</p>}
        </section>}

        <section className="card score-distribution-strip">
          <div><span>Birdie+</span><strong>{analysis.birdiesOrBetter}</strong></div><div><span>Par</span><strong>{analysis.pars}</strong></div><div><span>Bogey</span><strong>{analysis.bogeys}</strong></div><div><span>Double</span><strong>{analysis.doubles}</strong></div><div><span>Triple+</span><strong>{analysis.triplesPlus}</strong></div>
        </section>

        <section className="insight-pair round-insights">
          <article className="insight-card good"><span className="insight-icon">✓</span><div><p className="eyebrow">What went well</p>{analysis.strengths.length ? analysis.strengths.map((insight) => <div className="insight-list-item" key={insight.title}><h3>{insight.title}</h3><p>{insight.detail}</p></div>) : <p>Complete more tracked metrics to identify strengths.</p>}</div></article>
          <article className="insight-card warning"><span className="insight-icon">!</span><div><p className="eyebrow">What cost strokes</p>{analysis.opportunities.length ? analysis.opportunities.map((insight) => <div className="insight-list-item" key={insight.title}><h3>{insight.title}</h3><p>{insight.detail}</p></div>) : <p>No major scoring leaks were identified in the tracked data.</p>}</div></article>
        </section>

        <section className="card next-focus-card"><p className="eyebrow">Next-round priority</p><h2>{analysis.nextFocus.title}</h2><p>{analysis.nextFocus.detail}</p></section>

        {settings.notes && <section className="card notes-summary-card">
          <p className="eyebrow">Round notes</p><h2>{analysis.notesSummary}</h2>
          {analysis.notes.length ? <div className="round-note-list">{analysis.notes.map((note) => <div key={note.hole}><strong>Hole {note.hole}</strong><span>{note.text}</span></div>)}</div> : <p className="muted">Add hole notes during the round to preserve miss patterns and decisions.</p>}
        </section>}

        {(analysis.bestHole || analysis.worstHole) && <section className="highlight-holes">
          {analysis.bestHole && <article className="card"><p className="eyebrow">Best hole</p><h2>Hole {analysis.bestHole.hole_number}</h2><strong>{analysis.bestHole.score} on par {analysis.bestHole.par}</strong><span>{formatToPar((analysis.bestHole.score ?? 0) - (analysis.bestHole.par ?? 0))}</span></article>}
          {analysis.worstHole && <article className="card"><p className="eyebrow">Costliest hole</p><h2>Hole {analysis.worstHole.hole_number}</h2><strong>{analysis.worstHole.score} on par {analysis.worstHole.par}</strong><span>{formatToPar((analysis.worstHole.score ?? 0) - (analysis.worstHole.par ?? 0))}</span></article>}
        </section>}
        {onAnalytics && round.status === 'complete' && <button type="button" className="secondary large" onClick={onAnalytics}>View performance analytics →</button>}
      </section>}

      {view === 'simple' && <section className="card scorecard-table-card">
        <div className="scorecard-scroll"><table className="scorecard-table traditional-scorecard">
          <thead><tr><th>Hole</th><th>Par</th>{players.map((player) => <th key={player.id}><strong>{player.name}</strong><small>{player.tee_name || round.tee_name} · HCP {playerHandicap(round, player)}</small></th>)}</tr></thead>
          <tbody>{holes.map((hole, index) => <tr key={hole.id} className={onSelectHole ? 'selectable-row' : ''} onClick={() => onSelectHole?.(index)}>
            <th>{hole.hole_number}</th><td>{hole.par ?? '—'}</td>
            {players.map((player) => { const score = scoreFor(hole, player); const relative = relativeFor(hole, player); return <td key={player.id}><ScoreSymbol score={score} relative={relative} /><small>{relativeLabel(relative)}</small></td> })}
          </tr>)}</tbody>
          <tfoot><tr><th>Total</th><td>{holes.reduce((sum, hole) => sum + Number(hole.par ?? 0), 0) || '—'}</td>{totals.map(({ player, score, toPar }) => <td key={player.id}><strong>{score ?? '—'}</strong><small>{formatToPar(toPar)}</small></td>)}</tr></tfoot>
        </table></div>
        <div className="scorecard-legend"><span><i className="legend-circle" />Under par</span><span><i />Par</span><span><i className="legend-square" />Over par</span></div>
        {onSelectHole && <p className="muted compact table-hint">Tap a hole row to return to that hole.</p>}
      </section>}

      {view === 'detailed' && <section className="detail-scorecard stack">
        <div className="details-mode-toggle"><button type="button" className={detailsMode === 'matrix' ? 'active' : ''} onClick={() => setDetailsMode('matrix')}>Matrix</button><button type="button" className={detailsMode === 'cards' ? 'active' : ''} onClick={() => setDetailsMode('cards')}>Hole cards</button></div>
        {detailsMode === 'matrix' ? <section className="card detail-matrix-card"><div className="detail-matrix-scroll"><table className="detail-matrix"><thead><tr><th>Metric</th>{holes.map((hole, index) => <th key={hole.id} onClick={() => onSelectHole?.(index)}>H{hole.hole_number}</th>)}</tr></thead><tbody>{matrixRows.map((row) => <tr key={row.label}><th>{row.label}</th>{holes.map((hole, index) => <td key={hole.id} onClick={() => onSelectHole?.(index)}>{row.values(hole)}</td>)}</tr>)}</tbody></table></div><p className="muted compact table-hint">Metrics stay on the left while holes scroll across the top. Tap a hole column to edit an active round.</p></section> : holes.map((hole, index) => {
          const methodValues = [hole.plan, hole.routine, hole.commit, hole.smart_decision, hole.reset].filter((value) => value != null)
          const methodScore = methodValues.reduce<number>((sum, value) => sum + Number(value), 0)
          const guestPlayers = players.filter((player) => !player.is_primary)
          const primaryScore = scoreFor(hole, primary)
          const primaryRelative = relativeFor(hole, primary)
          return <article className="card detail-hole-card" key={hole.id} onClick={() => onSelectHole?.(index)}>
            <div className="detail-hole-heading"><div><p className="eyebrow">Hole {hole.hole_number}</p><h2>Par {hole.par ?? '—'} · {scoreMode === 'net' ? 'Net ' : ''}{primaryScore ?? '—'} strokes</h2></div><ScoreSymbol score={primaryScore} relative={primaryRelative} /></div>
            {guestPlayers.length > 0 && <div className="detail-stat-grid guest-summary">{guestPlayers.map((player) => <div className="detail-stat" key={player.id}><span>{player.name} · {player.tee_name}</span><ScoreSymbol score={scoreFor(hole, player)} relative={relativeFor(hole, player)} compact /></div>)}</div>}
            <div className="detail-stat-grid">
              {settings.courseDetails && <><div className="detail-stat"><span>Yards</span><strong>{hole.yardage ?? '—'}</strong></div><div className="detail-stat"><span>HCP</span><strong>{hole.hole_handicap ?? '—'}</strong></div></>}
              {settings.teeClub && <div className="detail-stat"><span>Tee club</span><strong>{hole.club_used_off_tee || '—'}</strong></div>}
              {settings.teeResult && <div className="detail-stat"><span>Tee result</span><strong>{hole.tee_result || '—'}</strong></div>}
              {settings.scoringZone && <><div className="detail-stat"><span>Enter zone</span><strong>{hole.entering_zone_actual ?? '—'} / {hole.entering_zone_target ?? '—'}</strong></div><div className="detail-stat"><span>Down in zone</span><strong>{hole.down_zone_actual ?? '—'} / 3</strong></div></>}
              {settings.shortGame && <div className="detail-stat"><span>Chips / pitches</span><strong>{hole.chips_pitches ?? '—'}</strong></div>}
              {settings.putting && <div className="detail-stat"><span>Putts</span>{puttStatus(hole.putts)}</div>}
              {settings.inside4ft && <div className="detail-stat"><span>Inside 4 ft</span><strong>{hole.inside_4ft_result || '—'}</strong></div>}
              {settings.madePuttLength && <div className="detail-stat"><span>Made putt</span><strong>{hole.made_putt_length_ft == null ? '—' : `${hole.made_putt_length_ft} ft`}</strong></div>}
              {settings.penalties && <div className="detail-stat"><span>Penalties</span><strong>{hole.penalty_strokes}</strong></div>}
              {settings.methodScore && <div className="detail-stat wide"><span>Method score</span><strong>{methodValues.length ? `${methodScore}/${methodValues.length}` : '—'}</strong><small>Plan {hole.plan ?? '—'} · Routine {hole.routine ?? '—'} · Commit {hole.commit ?? '—'} · Smart {hole.smart_decision ?? '—'} · Reset {hole.reset ?? '—'}</small></div>}
              {settings.notes && hole.notes && <div className="detail-stat wide"><span>Notes</span><strong>{hole.notes}</strong></div>}
              {settings.scoringZone && <><div className="detail-stat"><span>Enter point</span>{pointStatus(hole.entering_zone_point)}</div><div className="detail-stat"><span>Down point</span>{pointStatus(hole.down_zone_point)}</div></>}
              {settings.gir && <div className="detail-stat"><span>GIR</span>{yesNoStatus(hole.gir)}</div>}
              {settings.shortGame && <div className="detail-stat"><span>Up & down</span>{yesNoStatus(hole.up_down)}</div>}
            </div>
          </article>
        })}
      </section>}

      <button type="button" className="danger-button" onClick={onDelete}>Delete this round</button>
    </main>
  )
}
