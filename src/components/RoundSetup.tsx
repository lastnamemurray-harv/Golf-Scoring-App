import { useEffect, useMemo, useState } from 'react'
import type { Course, CourseHole, CourseTee, MetricConfig, Round, HoleResult, Player } from '../types'
import { DEFAULT_PLAYERS } from '../types'

const MANUAL_TEE = '__manual__'

interface Props {
  courses: Course[]
  courseHoles: CourseHole[]
  courseTees: CourseTee[]
  settings: MetricConfig
  onStart: (round: Round, holes: HoleResult[]) => void
  onImport: () => void
}

function nullableNumber(value: string): number | null {
  return value.trim() === '' ? null : Number(value)
}

export default function RoundSetup({ courses, courseHoles, courseTees, settings, onStart, onImport }: Props) {
  const [courseKey, setCourseKey] = useState(courses[0]?.course_key ?? '')
  const [teeSelection, setTeeSelection] = useState('')
  const [manualTeeName, setManualTeeName] = useState('')
  const [manualPar, setManualPar] = useState('')
  const [manualYardage, setManualYardage] = useState('')
  const [manualRating, setManualRating] = useState('')
  const [manualSlope, setManualSlope] = useState('')
  const [handicap, setHandicap] = useState<string>('')
  const [target, setTarget] = useState<string>('')
  const [focus, setFocus] = useState('Avoid blow-up holes')
  const [players, setPlayers] = useState<Player[]>(DEFAULT_PLAYERS.map((player) => ({ ...player })))

  const course = useMemo(() => courses.find((item) => item.course_key === courseKey), [courses, courseKey])
  const availableTees = useMemo(() => {
    const byName = new Map<string, CourseTee>()
    courseTees.filter((tee) => tee.course_key === courseKey).forEach((tee) => byName.set(tee.tee_name, tee))
    courseHoles.filter((hole) => hole.course_key === courseKey && hole.tee_name).forEach((hole) => {
      if (!byName.has(hole.tee_name)) byName.set(hole.tee_name, {
        id: `hole-derived-${courseKey}-${hole.tee_name}`,
        course_id: hole.course_id,
        course_key: courseKey,
        tee_name: hole.tee_name,
        par: null,
        total_yardage: null,
        rating: null,
        slope: null,
        is_default: hole.tee_name === course?.default_tee,
      })
    })
    return [...byName.values()].sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1
      return Number(b.total_yardage ?? 0) - Number(a.total_yardage ?? 0) || a.tee_name.localeCompare(b.tee_name)
    })
  }, [courseHoles, courseKey, courseTees, course?.default_tee])

  useEffect(() => {
    if (!course) return
    const preferred = availableTees.find((tee) => tee.tee_name === course.default_tee) ?? availableTees[0]
    if (preferred) {
      setTeeSelection(preferred.tee_name)
      setManualTeeName('')
    } else {
      setTeeSelection(MANUAL_TEE)
      setManualTeeName(course.default_tee || '')
    }
    setManualPar('')
    setManualYardage('')
    setManualRating('')
    setManualSlope('')
  }, [course, availableTees])

  const teeName = teeSelection === MANUAL_TEE ? manualTeeName.trim() : teeSelection
  const selectedTee = useMemo(() => availableTees.find((tee) => tee.tee_name === teeSelection), [availableTees, teeSelection])
  const matchingHoles = useMemo(() => courseHoles
    .filter((hole) => hole.course_key === courseKey && hole.tee_name === teeName)
    .sort((a, b) => a.hole_number - b.hole_number), [courseHoles, courseKey, teeName])
  const fallbackTee = useMemo(() => course?.default_tee || availableTees[0]?.tee_name || '', [course, availableTees])
  const fallbackTeeMeta = useMemo(() => availableTees.find((tee) => tee.tee_name === fallbackTee), [availableTees, fallbackTee])
  const fallbackHoles = useMemo(() => courseHoles
    .filter((hole) => hole.course_key === courseKey && hole.tee_name === fallbackTee)
    .sort((a, b) => a.hole_number - b.hole_number), [courseHoles, courseKey, fallbackTee])

  const exactPar = matchingHoles.length && matchingHoles.every((hole) => hole.par != null)
    ? matchingHoles.reduce((sum, hole) => sum + Number(hole.par), 0) : null
  const exactYardage = matchingHoles.length && matchingHoles.every((hole) => hole.yardage != null)
    ? matchingHoles.reduce((sum, hole) => sum + Number(hole.yardage), 0) : null
  const teePar = teeSelection === MANUAL_TEE ? nullableNumber(manualPar) : selectedTee?.par ?? exactPar ?? null
  const teeYardage = teeSelection === MANUAL_TEE ? nullableNumber(manualYardage) : selectedTee?.total_yardage ?? exactYardage ?? null
  const teeRating = teeSelection === MANUAL_TEE ? nullableNumber(manualRating) : selectedTee?.rating ?? null
  const teeSlope = teeSelection === MANUAL_TEE ? nullableNumber(manualSlope) : selectedTee?.slope ?? null
  const hasExactHoleData = matchingHoles.length > 0

  function addPlayer() { setPlayers((items) => [...items, { id: crypto.randomUUID(), name: '', is_primary: false }]) }
  function updatePlayer(id: string, name: string) { setPlayers((items) => items.map((player) => player.id === id ? { ...player, name } : player)) }
  function removePlayer(id: string) { setPlayers((items) => items.filter((player) => player.id !== id)) }

  function startRound() {
    if (!course || !teeName) return
    const cleanedPlayers = players.map((player) => ({ ...player, name: player.name.trim() })).filter((player) => player.is_primary || player.name)
    const guestPlayers = cleanedPlayers.filter((player) => !player.is_primary)
    const roundId = crypto.randomUUID()
    const now = new Date().toISOString()
    const holeCountSource = matchingHoles.length ? matchingHoles : fallbackHoles
    const holeCount = holeCountSource.length ? Math.max(...holeCountSource.map((hole) => hole.hole_number)) : course.hole_count === 9 ? 9 : 18
    const genderedTee = /ladies|women/i.test(teeName)
    const canReusePar = !genderedTee && teePar != null && teePar === (fallbackTeeMeta?.par ?? course.course_par)

    const holes: HoleResult[] = Array.from({ length: holeCount }, (_, index) => {
      const exactSource = matchingHoles.find((hole) => hole.hole_number === index + 1)
      const fallbackSource = fallbackHoles.find((hole) => hole.hole_number === index + 1)
      const par = exactSource?.par ?? (canReusePar ? fallbackSource?.par ?? null : null)
      return {
        id: crypto.randomUUID(), round_id: roundId, hole_number: index + 1,
        par, yardage: exactSource?.yardage ?? null,
        hole_handicap: exactSource?.handicap ?? (!genderedTee ? fallbackSource?.handicap ?? null : null),
        entering_zone_target: par ? par - 2 : null, entering_zone_actual: null, entering_zone_point: null,
        down_zone_target: 3, down_zone_actual: null, down_zone_point: null, score: null,
        player_scores: Object.fromEntries(guestPlayers.map((player) => [player.id, null])), putts: null,
        inside_4ft_result: '', made_putt_length_ft: null, penalty_strokes: 0, tee_result: '', club_used_off_tee: '',
        gir: '', chips_pitches: null, up_down: '', plan: null, routine: null, commit: null, smart_decision: null,
        reset: null, notes: '', updated_at: now,
      }
    })

    const round: Round = {
      id: roundId, course_id: course.id, course_key: course.course_key, course_name: course.name, layout: course.layout,
      tee_name: teeName, tee_par: teePar, tee_yardage: teeYardage, course_rating: teeRating, course_slope: teeSlope,
      date: now.slice(0, 10), started_at: now, completed_at: null, status: 'in_progress',
      playing_handicap: handicap ? Number(handicap) : null, target_score: target ? Number(target) : null,
      primary_focus: focus, tracking_config: { ...settings },
      players: cleanedPlayers.length ? cleanedPlayers : DEFAULT_PLAYERS.map((player) => ({ ...player })),
    }
    onStart(round, holes)
  }

  return (
    <main className="page stack">
      <header><p className="eyebrow">New round</p><h1>Set up your round</h1></header>
      <section className="card stack">
        <label className="field"><span>Course</span><select value={courseKey} onChange={(event) => setCourseKey(event.target.value)}>{courses.slice().sort((a, b) => a.course_key.localeCompare(b.course_key)).map((item) => <option key={item.id} value={item.course_key}>{item.course_key}</option>)}</select></label>
        <label className="field"><span>Tee</span><select value={teeSelection} onChange={(event) => setTeeSelection(event.target.value)}>{availableTees.map((tee) => <option key={tee.id} value={tee.tee_name}>{tee.tee_name}{tee.total_yardage ? ` · ${tee.total_yardage} yd` : ''}</option>)}<option value={MANUAL_TEE}>Other / manual tee</option></select></label>

        {teeSelection === MANUAL_TEE && <section className="manual-tee-grid">
          <label className="field wide"><span>Manual tee name</span><input value={manualTeeName} onChange={(event) => setManualTeeName(event.target.value)} placeholder="White, Blue, Gold…" /></label>
          <label className="field"><span>Par</span><input inputMode="numeric" type="number" value={manualPar} onChange={(event) => setManualPar(event.target.value)} /></label>
          <label className="field"><span>Total yards</span><input inputMode="numeric" type="number" value={manualYardage} onChange={(event) => setManualYardage(event.target.value)} /></label>
          <label className="field"><span>Rating</span><input inputMode="decimal" type="number" step="0.1" value={manualRating} onChange={(event) => setManualRating(event.target.value)} /></label>
          <label className="field"><span>Slope</span><input inputMode="numeric" type="number" value={manualSlope} onChange={(event) => setManualSlope(event.target.value)} /></label>
        </section>}

        {course && <div className="course-summary">
          <strong>{course.city || 'Location not listed'}</strong>
          <span>{teeName || 'Select a tee'} · Par {teePar ?? '—'} · {teeYardage ? `${teeYardage} yards` : 'yardage not listed'}</span>
          <span>Rating {teeRating ?? '—'} / Slope {teeSlope ?? '—'}</span>
          <span>{hasExactHoleData ? 'Hole-by-hole par, yardage and handicap are available for this tee.' : 'Tee totals are available; verify hole-level par, yardage and handicap before or during play.'}</span>
        </div>}

        <button className="secondary" type="button" onClick={onImport}>📷 Import a scorecard photo</button>
        <section className="subsection stack">
          <div className="section-title"><div><h2>Players</h2><p className="muted compact">Your full metrics are tracked. Additional players are score-only.</p></div></div>
          {players.map((player) => <div className="player-row" key={player.id}><label className="field"><span>{player.is_primary ? 'Primary player' : 'Playing partner'}</span><input value={player.name} disabled={player.is_primary} onChange={(event) => updatePlayer(player.id, event.target.value)} placeholder="Player name" /></label>{!player.is_primary && <button type="button" className="icon-button danger-text" onClick={() => removePlayer(player.id)}>Remove</button>}</div>)}
          <button type="button" className="secondary" onClick={addPlayer}>＋ Add another player</button>
        </section>
        <div className="two-col"><label className="field"><span>Playing handicap</span><input inputMode="numeric" type="number" value={handicap} onChange={(event) => setHandicap(event.target.value)} /></label><label className="field"><span>Target score</span><input inputMode="numeric" type="number" value={target} onChange={(event) => setTarget(event.target.value)} /></label></div>
        <label className="field"><span>Primary focus</span><input value={focus} onChange={(event) => setFocus(event.target.value)} /></label>
        <button className="primary large" type="button" disabled={!course || !teeName} onClick={startRound}>Start round</button>
      </section>
    </main>
  )
}
