import { useMemo } from 'react'
import type { HoleResult, MetricConfig, Round } from '../types'
import NumberField from './NumberField'
import Segmented from './Segmented'
import SyncBadge from './SyncBadge'
import type { SyncState } from '../types'

const CLUBS = ['Driver','3-Wood','5-Wood','7-Wood','2-Hybrid','3-Hybrid','4-Hybrid','3-Iron','4-Iron','5-Iron','6-Iron','7-Iron','8-Iron','9-Iron','PW','GW','SW','LW','Putter','Other']
const TEE_RESULTS = ['FIR','Miss L','Miss R','Short','Long','Trouble','Penalty','N/A']

interface Props {
  round: Round
  hole: HoleResult
  holeIndex: number
  totalHoles: number
  settings: MetricConfig
  syncState: SyncState
  onChange: (hole: HoleResult) => void
  onPrevious: () => void
  onNext: () => void
  onFinish: () => void
}

export default function HoleEntry({ round, hole, holeIndex, totalHoles, settings, syncState, onChange, onPrevious, onNext, onFinish }: Props) {
  const enteringPoint = hole.entering_zone_actual == null || hole.entering_zone_target == null ? null : Number(hole.entering_zone_actual <= hole.entering_zone_target)
  const downPoint = hole.down_zone_actual == null ? null : Number(hole.down_zone_actual <= 3)
  const methodScore = [hole.plan, hole.routine, hole.commit, hole.smart_decision, hole.reset].filter((v) => v != null).reduce<number>((sum, value) => sum + Number(value), 0)
  const completedMethod = [hole.plan, hole.routine, hole.commit, hole.smart_decision, hole.reset].filter((v) => v != null).length
  const toPar = hole.score != null && hole.par != null ? hole.score - hole.par : null
  const zonePoints = [enteringPoint, downPoint].filter((v) => v != null).reduce<number>((sum, value) => sum + Number(value), 0)

  const update = (patch: Partial<HoleResult>) => onChange({
    ...hole,
    ...patch,
    entering_zone_target: patch.par !== undefined && patch.par != null ? patch.par - 2 : hole.entering_zone_target,
    entering_zone_point: patch.entering_zone_actual !== undefined || patch.par !== undefined
      ? ((patch.entering_zone_actual ?? hole.entering_zone_actual) == null || (patch.par ?? hole.par) == null ? null : Number((patch.entering_zone_actual ?? hole.entering_zone_actual)! <= (patch.par ?? hole.par)! - 2))
      : enteringPoint,
    down_zone_point: patch.down_zone_actual !== undefined
      ? (patch.down_zone_actual == null ? null : Number(patch.down_zone_actual <= 3))
      : downPoint,
    updated_at: new Date().toISOString(),
  })

  const scoreLabel = useMemo(() => {
    if (toPar == null) return 'No score yet'
    if (toPar === 0) return 'Even par'
    return `${toPar > 0 ? '+' : ''}${toPar}`
  }, [toPar])

  return (
    <main className="page round-page">
      <header className="hole-header">
        <div><p className="eyebrow">{round.course_name} · {round.tee_name}</p><h1>Hole {hole.hole_number}</h1></div>
        <SyncBadge state={syncState} />
      </header>
      <div className="hole-progress"><span style={{ width: `${((holeIndex + 1) / totalHoles) * 100}%` }} /></div>
      <section className="hole-hero">
        <label><span>Par</span><input inputMode="numeric" type="number" value={hole.par ?? ''} onChange={(e) => update({ par: e.target.value ? Number(e.target.value) : null })} /></label>
        {settings.courseDetails && <><div><span>Yards</span><strong>{hole.yardage ?? '—'}</strong></div><div><span>HCP</span><strong>{hole.hole_handicap ?? '—'}</strong></div></>}
        <div><span>Score</span><strong>{hole.score ?? '—'}</strong><small>{scoreLabel}</small></div>
      </section>

      <div className="stack section-gap">
        <section className="card stack"><h2>Score</h2><NumberField label="Strokes" value={hole.score} min={1} max={15} onChange={(score) => update({ score })} /></section>

        {(settings.teeClub || settings.teeResult) && <section className="card stack"><h2>Off the tee</h2>{settings.teeClub && <label className="field"><span>Club used</span><select value={hole.club_used_off_tee} onChange={(e) => update({ club_used_off_tee: e.target.value })}><option value="">Select club</option>{CLUBS.map((club) => <option key={club}>{club}</option>)}</select></label>}{settings.teeResult && <label className="field"><span>Tee result</span><select value={hole.tee_result} onChange={(e) => update({ tee_result: e.target.value })}><option value="">Select result</option>{TEE_RESULTS.map((result) => <option key={result}>{result}</option>)}</select></label>}</section>}

        {settings.scoringZone && <section className="card stack"><div className="section-title"><h2>Scoring zone</h2><span className="points">{zonePoints}/2 pts</span></div><div className="metric-row"><div><span>Entering target</span><strong>{hole.entering_zone_target ?? '—'}</strong></div><NumberField label="Actual stroke" value={hole.entering_zone_actual} min={1} max={12} onChange={(value) => update({ entering_zone_actual: value })} /><span className={`point-chip ${enteringPoint === 1 ? 'earned' : enteringPoint === 0 ? 'missed' : ''}`}>{enteringPoint == null ? '—' : `${enteringPoint} pt`}</span></div><div className="metric-row"><div><span>Down target</span><strong>3</strong></div><NumberField label="Actual strokes" value={hole.down_zone_actual} min={1} max={10} onChange={(value) => update({ down_zone_actual: value })} /><span className={`point-chip ${downPoint === 1 ? 'earned' : downPoint === 0 ? 'missed' : ''}`}>{downPoint == null ? '—' : `${downPoint} pt`}</span></div></section>}

        {(settings.gir || settings.shortGame) && <section className="card stack"><h2>Approach & short game</h2>{settings.gir && <Segmented label="Green in regulation" value={hole.gir} options={['Yes','No','N/A'] as const} onChange={(value) => update({ gir: value })} />}{settings.shortGame && <><NumberField label="Chips / pitches" value={hole.chips_pitches} min={0} max={10} onChange={(value) => update({ chips_pitches: value })} /><Segmented label="Up and down" value={hole.up_down} options={['Yes','No','N/A'] as const} onChange={(value) => update({ up_down: value })} /></>}</section>}

        {(settings.putting || settings.inside4ft || settings.madePuttLength) && <section className="card stack"><h2>Putting</h2>{settings.putting && <NumberField label="Putts" value={hole.putts} min={0} max={10} onChange={(value) => update({ putts: value })} />}{settings.inside4ft && <Segmented label="Putt inside 4 feet" value={hole.inside_4ft_result} options={['Made','Missed','N/A'] as const} onChange={(value) => update({ inside_4ft_result: value })} />}{settings.madePuttLength && <NumberField label="Length of made putt (feet)" value={hole.made_putt_length_ft} min={0} max={100} step={0.5} onChange={(value) => update({ made_putt_length_ft: value })} />}</section>}

        {settings.penalties && <section className="card stack"><h2>Penalties</h2><NumberField label="Penalty strokes" value={hole.penalty_strokes} min={0} max={10} onChange={(value) => update({ penalty_strokes: value ?? 0 })} /></section>}

        {settings.methodScore && <section className="card stack"><div className="section-title"><h2>Method score</h2><span className="points">{methodScore}/{completedMethod || 5}</span></div>{([['Plan','plan'],['Routine','routine'],['Commit','commit'],['Smart decision','smart_decision'],['Reset','reset']] as const).map(([label,key]) => <Segmented key={key} label={label} value={hole[key]} options={[1,0] as const} onChange={(value) => update({ [key]: value })} />)}</section>}

        {settings.notes && <section className="card stack"><h2>Notes</h2><label className="field"><span>Miss pattern or context</span><textarea rows={3} value={hole.notes} onChange={(e) => update({ notes: e.target.value })} /></label></section>}
      </div>

      <div className="round-actions"><button type="button" className="secondary" disabled={holeIndex === 0} onClick={onPrevious}>Previous</button>{holeIndex === totalHoles - 1 ? <button type="button" className="primary" onClick={onFinish}>Finish round</button> : <button type="button" className="primary" onClick={onNext}>Save & next</button>}</div>
    </main>
  )
}
