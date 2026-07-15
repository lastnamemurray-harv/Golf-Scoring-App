import { useMemo, useState } from 'react'
import type { HoleResult, MetricConfig, Round, SyncState } from '../types'
import NumberField from './NumberField'
import Segmented from './Segmented'
import SyncBadge from './SyncBadge'
import TeeResultGrid from './TeeResultGrid'
import { formatToPar } from '../lib/analytics'

const CLUBS = ['Driver','3-Wood','5-Wood','7-Wood','2-Hybrid','3-Hybrid','4-Hybrid','3-Iron','4-Iron','5-Iron','6-Iron','7-Iron','8-Iron','9-Iron','PW','GW','SW','LW','Putter','Other']

function calculateUpDown(chips: number | null, putts: number | null): HoleResult['up_down'] {
  if (chips == null) return ''
  if (chips === 0) return 'N/A'
  if (putts == null) return ''
  return chips === 1 && putts <= 1 ? 'Yes' : 'No'
}

function calculateGir(score: number | null, putts: number | null, par: number | null): HoleResult['gir'] {
  if (score == null || putts == null || par == null) return ''
  return score - putts <= par - 2 ? 'Yes' : 'No'
}

function resultClass(value: number | string | null): string {
  if (value === 1 || value === 'Yes') return 'auto-good'
  if (value === 0 || value === 'No') return 'auto-bad'
  return ''
}

interface Props {
  round: Round
  hole: HoleResult
  holeIndex: number
  totalHoles: number
  settings: MetricConfig
  syncState: SyncState
  cumulativeToPar: number | null
  onChange: (hole: HoleResult) => void
  onPrevious: () => void
  onNext: () => void
  onFinish: () => void
  onHome: () => void
  onScorecard: () => void
}

export default function HoleEntry({
  round, hole, holeIndex, totalHoles, settings, syncState, cumulativeToPar,
  onChange, onPrevious, onNext, onFinish, onHome, onScorecard,
}: Props) {
  const enteringPoint = hole.entering_zone_actual == null || hole.entering_zone_target == null
    ? null
    : Number(hole.entering_zone_actual <= hole.entering_zone_target)
  const downPoint = hole.down_zone_actual == null ? null : Number(hole.down_zone_actual <= 3)
  const calculatedGir = calculateGir(hole.score, hole.putts, hole.par)
  const calculatedUpDown = calculateUpDown(hole.chips_pitches, hole.putts)
  const methodValues = [hole.plan, hole.routine, hole.commit, hole.smart_decision, hole.reset]
  const methodScore = methodValues.filter((value) => value != null).reduce<number>((sum, value) => sum + Number(value), 0)
  const completedMethod = methodValues.filter((value) => value != null).length
  const toPar = hole.score != null && hole.par != null ? hole.score - hole.par : null
  const zonePoints = [enteringPoint, downPoint].filter((value) => value != null).reduce<number>((sum, value) => sum + Number(value), 0)
  const guests = round.players.filter((player) => !player.is_primary)
  const [editingHoleInfo, setEditingHoleInfo] = useState(false)
  const targetZoneYards = settings.targetZoneYards || 100

  const update = (patch: Partial<HoleResult>) => {
    const nextChips = patch.chips_pitches !== undefined ? patch.chips_pitches : hole.chips_pitches
    const nextPutts = patch.putts !== undefined ? patch.putts : hole.putts
    const nextScore = patch.score !== undefined ? patch.score : hole.score
    const nextPar = patch.par !== undefined ? patch.par : hole.par
    const recalculateUpDown = patch.chips_pitches !== undefined || patch.putts !== undefined
    const recalculateGir = patch.score !== undefined || patch.putts !== undefined || patch.par !== undefined

    onChange({
      ...hole,
      ...patch,
      entering_zone_target: patch.par !== undefined && patch.par != null ? patch.par - 2 : hole.entering_zone_target,
      entering_zone_point: patch.entering_zone_actual !== undefined || patch.par !== undefined
        ? ((patch.entering_zone_actual ?? hole.entering_zone_actual) == null || (patch.par ?? hole.par) == null
          ? null
          : Number((patch.entering_zone_actual ?? hole.entering_zone_actual)! <= (patch.par ?? hole.par)! - 2))
        : enteringPoint,
      down_zone_point: patch.down_zone_actual !== undefined
        ? (patch.down_zone_actual == null ? null : Number(patch.down_zone_actual <= 3))
        : downPoint,
      gir: recalculateGir ? calculateGir(nextScore, nextPutts, nextPar) : hole.gir,
      up_down: recalculateUpDown ? calculateUpDown(nextChips, nextPutts) : hole.up_down,
      updated_at: new Date().toISOString(),
    })
  }

  const updateGuestScore = (playerId: string, value: number | null) => update({
    player_scores: { ...(hole.player_scores ?? {}), [playerId]: value },
  })

  const scoreLabel = useMemo(() => {
    if (toPar == null) return 'No score yet'
    if (toPar === 0) return 'Even par'
    return `${toPar > 0 ? '+' : ''}${toPar}`
  }, [toPar])

  return (
    <main className="page round-page">
      <div className="round-toolbar">
        <button type="button" className="secondary compact-button" onClick={onHome}>⌂ Home</button>
        <button type="button" className="secondary compact-button" onClick={onScorecard}>▤ Scorecard</button>
      </div>
      <header className="hole-header">
        <div><p className="eyebrow">{round.course_name} · {round.tee_name}</p><h1>Hole {hole.hole_number}</h1></div>
        <div className="hole-status-stack">
          <div className="cumulative-to-par"><span>Round</span><strong>{formatToPar(cumulativeToPar)}</strong></div>
          <SyncBadge state={syncState} />
        </div>
      </header>
      <div className="hole-progress"><span style={{ width: `${((holeIndex + 1) / totalHoles) * 100}%` }} /></div>
      <section className="hole-hero">
        <div><span>Par</span><strong>{hole.par ?? '—'}</strong></div>
        {settings.courseDetails && <><div><span>Yards</span><strong>{hole.yardage ?? '—'}</strong></div><div><span>HCP</span><strong>{hole.hole_handicap ?? '—'}</strong></div></>}
        <div><span>Score</span><strong>{hole.score ?? '—'}</strong><small>{scoreLabel}</small></div>
      </section>
      <button type="button" className="text-button hole-info-toggle" onClick={() => setEditingHoleInfo((open) => !open)}>{editingHoleInfo ? 'Close hole info' : 'Edit hole par, yards or HCP'}</button>

      <div className="stack section-gap">
        {editingHoleInfo && <section className="card stack hole-info-editor">
          <div><h2>Override hole information</h2><p className="muted compact">These changes apply to this round and recalculate scoring-zone targets immediately.</p></div>
          <div className="three-col">
            <NumberField label="Par" value={hole.par} min={2} max={7} onChange={(value) => update({ par: value })} />
            <NumberField label="Yards" value={hole.yardage} min={20} max={1000} onChange={(value) => update({ yardage: value })} />
            <NumberField label="Hole HCP" value={hole.hole_handicap} min={1} max={36} onChange={(value) => update({ hole_handicap: value })} />
          </div>
          <button type="button" className="secondary" onClick={() => setEditingHoleInfo(false)}>Done</button>
        </section>}

        <section className="card stack">
          <h2>Your score</h2>
          <NumberField label="Strokes" value={hole.score} min={1} max={15} onChange={(score) => update({ score })} />
        </section>

        {guests.length > 0 && <section className="card stack">
          <div><h2>Playing partners</h2><p className="muted compact">Score only</p></div>
          <div className="guest-score-grid">
            {guests.map((player) => <NumberField
              key={player.id}
              label={`${player.name} · ${player.tee_name || round.tee_name} · HCP ${player.playing_handicap ?? '—'}`}
              value={hole.player_scores?.[player.id] ?? null}
              min={1}
              max={15}
              onChange={(value) => updateGuestScore(player.id, value)}
            />)}
          </div>
        </section>}

        {(settings.teeClub || settings.teeResult) && <section className="card stack">
          <h2>Off the tee</h2>
          {settings.teeClub && <label className="field"><span>Club used</span><select value={hole.club_used_off_tee} onChange={(event) => update({ club_used_off_tee: event.target.value })}><option value="">Select club</option>{CLUBS.map((club) => <option key={club}>{club}</option>)}</select></label>}
          {settings.teeResult && <TeeResultGrid value={hole.tee_result} onChange={(value) => update({ tee_result: value })} />}
        </section>}

        {settings.scoringZone && <section className="card stack">
          <div className="section-title"><h2>Scoring zone</h2><span className="points">{zonePoints}/2 pts</span></div>
          <div className="metric-row metric-input-only">
            <div><span>Entering target</span><strong>{hole.entering_zone_target ?? '—'}</strong><small>Strokes to get within {targetZoneYards} yards of green.</small></div>
            <NumberField label="Actual stroke" value={hole.entering_zone_actual} min={1} max={12} onChange={(value) => update({ entering_zone_actual: value })} />
          </div>
          <div className="metric-row metric-input-only">
            <div><span>Down target</span><strong>3</strong><small>Strokes inside {targetZoneYards} yards of green.</small></div>
            <NumberField label="Actual strokes" value={hole.down_zone_actual} min={1} max={10} onChange={(value) => update({ down_zone_actual: value })} />
          </div>
        </section>}

        {settings.shortGame && <section className="card stack">
          <h2>Approach & short game</h2>
          <NumberField label="Chips / pitches" value={hole.chips_pitches} min={0} max={10} onChange={(value) => update({ chips_pitches: value })} />
        </section>}

        {(settings.putting || settings.inside4ft || settings.madePuttLength) && <section className="card stack">
          <h2>Putting</h2>
          {settings.putting && <NumberField label="Putts" value={hole.putts} min={0} max={10} onChange={(value) => update({ putts: value })} />}
          {settings.inside4ft && <Segmented label="Putt inside 4 feet" value={hole.inside_4ft_result} options={['Made','Missed','N/A'] as const} onChange={(value) => update({ inside_4ft_result: value })} />}
          {settings.madePuttLength && <NumberField label="Length of made putt (feet)" value={hole.made_putt_length_ft} min={0} max={100} step={0.5} onChange={(value) => update({ made_putt_length_ft: value })} />}
        </section>}

        {settings.penalties && <section className="card stack"><h2>Penalties</h2><NumberField label="Penalty strokes" value={hole.penalty_strokes} min={0} max={10} onChange={(value) => update({ penalty_strokes: value ?? 0 })} /></section>}

        {settings.methodScore && <section className="card stack">
          <div className="section-title"><h2>Method score</h2><span className="points">{methodScore}/{completedMethod || 5}</span></div>
          {([['Plan','plan'],['Routine','routine'],['Commit','commit'],['Smart decision','smart_decision'],['Reset','reset']] as const).map(([label, key]) => <Segmented key={key} label={label} value={hole[key]} options={[1,0] as const} onChange={(value) => update({ [key]: value })} />)}
        </section>}

        {settings.notes && <section className="card stack"><h2>Notes</h2><label className="field"><span>Miss pattern or context</span><textarea rows={3} value={hole.notes} onChange={(event) => update({ notes: event.target.value })} /></label></section>}

        {(settings.scoringZone || settings.gir || settings.shortGame) && <section className="card stack calculated-results-card">
          <div><p className="eyebrow">Calculated</p><h2>Hole results</h2></div>
          <div className="calculated-results-grid">
            {settings.scoringZone && <>
              <div className={`auto-result ${resultClass(enteringPoint)}`}><span>Enter point</span><strong>{enteringPoint == null ? 'Pending' : `${enteringPoint} pt`}</strong><small>Target: par minus two strokes</small></div>
              <div className={`auto-result ${resultClass(downPoint)}`}><span>Down point</span><strong>{downPoint == null ? 'Pending' : `${downPoint} pt`}</strong><small>Target: three strokes or fewer</small></div>
            </>}
            {settings.gir && <div className={`auto-result ${resultClass(calculatedGir)}`}><span>Green in regulation</span><strong>{calculatedGir || 'Pending'}</strong><small>Calculated as (score − putts) ≤ (par − 2)</small></div>}
            {settings.shortGame && <div className={`auto-result ${resultClass(calculatedUpDown)}`}><span>Up and down</span><strong>{calculatedUpDown || 'Pending'}</strong><small>{hole.chips_pitches === 0 ? 'No short-game attempt' : hole.putts == null ? 'Enter putts to calculate' : 'Calculated from chips/pitches and putts'}</small></div>}
          </div>
        </section>}
      </div>

      <div className="round-actions">
        <button type="button" className="secondary" disabled={holeIndex === 0} onClick={onPrevious}>Previous</button>
        {holeIndex === totalHoles - 1
          ? <button type="button" className="primary" onClick={onFinish}>Finish round</button>
          : <button type="button" className="primary" onClick={onNext}>Save & next</button>}
      </div>
    </main>
  )
}
