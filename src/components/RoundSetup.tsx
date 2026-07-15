import { useEffect, useMemo, useState } from 'react'
import type { Course, CourseHole, MetricConfig, Round, HoleResult, Player } from '../types'
import { DEFAULT_PLAYERS } from '../types'

const MANUAL_TEE = '__manual__'

interface Props {
  courses: Course[]
  courseHoles: CourseHole[]
  settings: MetricConfig
  onStart: (round: Round, holes: HoleResult[]) => void
  onImport: () => void
}

export default function RoundSetup({ courses, courseHoles, settings, onStart, onImport }: Props) {
  const [courseKey, setCourseKey] = useState(courses[0]?.course_key ?? '')
  const [teeSelection, setTeeSelection] = useState('')
  const [manualTeeName, setManualTeeName] = useState('')
  const [handicap, setHandicap] = useState<string>('')
  const [target, setTarget] = useState<string>('')
  const [focus, setFocus] = useState('Avoid blow-up holes')
  const [players, setPlayers] = useState<Player[]>(DEFAULT_PLAYERS.map((player) => ({ ...player })))

  const course = useMemo(() => courses.find((item) => item.course_key === courseKey), [courses, courseKey])
  const availableTees = useMemo(() => {
    const teeSet = new Set(
      courseHoles
        .filter((hole) => hole.course_key === courseKey && hole.tee_name)
        .map((hole) => hole.tee_name),
    )
    return [...teeSet].sort((a, b) => a.localeCompare(b))
  }, [courseHoles, courseKey])

  useEffect(() => {
    if (!course) return
    if (availableTees.length) {
      const preferred = availableTees.includes(course.default_tee)
        ? course.default_tee
        : availableTees[0]
      setTeeSelection(preferred)
      setManualTeeName('')
    } else {
      setTeeSelection(MANUAL_TEE)
      setManualTeeName(course.default_tee || '')
    }
  }, [course, availableTees])

  const teeName = teeSelection === MANUAL_TEE ? manualTeeName.trim() : teeSelection

  const matchingHoles = useMemo(() => courseHoles
    .filter((hole) => hole.course_key === courseKey && hole.tee_name === teeName)
    .sort((a, b) => a.hole_number - b.hole_number), [courseHoles, courseKey, teeName])

  const fallbackTee = useMemo(() => {
    if (!course) return ''
    return availableTees.includes(course.default_tee) ? course.default_tee : availableTees[0] ?? ''
  }, [course, availableTees])

  const fallbackHoles = useMemo(() => courseHoles
    .filter((hole) => hole.course_key === courseKey && hole.tee_name === fallbackTee)
    .sort((a, b) => a.hole_number - b.hole_number), [courseHoles, courseKey, fallbackTee])

  const displayHoles = matchingHoles.length ? matchingHoles : fallbackHoles
  const teePar = displayHoles.length && displayHoles.every((hole) => hole.par != null)
    ? displayHoles.reduce((sum, hole) => sum + Number(hole.par), 0)
    : course?.course_par ?? null
  const teeYardage = matchingHoles.length && matchingHoles.every((hole) => hole.yardage != null)
    ? matchingHoles.reduce((sum, hole) => sum + Number(hole.yardage), 0)
    : teeSelection === MANUAL_TEE
      ? null
      : course?.total_yardage ?? null

  function addPlayer() {
    setPlayers((items) => [...items, { id: crypto.randomUUID(), name: '', is_primary: false }])
  }

  function updatePlayer(id: string, name: string) {
    setPlayers((items) => items.map((player) => player.id === id ? { ...player, name } : player))
  }

  function removePlayer(id: string) {
    setPlayers((items) => items.filter((player) => player.id !== id))
  }

  function startRound() {
    if (!course || !teeName) return
    const cleanedPlayers = players
      .map((player) => ({ ...player, name: player.name.trim() }))
      .filter((player) => player.is_primary || player.name)
    const guestPlayers = cleanedPlayers.filter((player) => !player.is_primary)
    const roundId = crypto.randomUUID()
    const now = new Date().toISOString()
    const holeCountSource = matchingHoles.length ? matchingHoles : fallbackHoles
    const holeCount = holeCountSource.length
      ? Math.max(...holeCountSource.map((hole) => hole.hole_number))
      : course.hole_count === 9 ? 9 : 18

    const holes: HoleResult[] = Array.from({ length: holeCount }, (_, index) => {
      const exactSource = matchingHoles.find((hole) => hole.hole_number === index + 1)
      const fallbackSource = fallbackHoles.find((hole) => hole.hole_number === index + 1)
      const source = exactSource ?? fallbackSource
      const par = source?.par ?? null
      return {
        id: crypto.randomUUID(),
        round_id: roundId,
        hole_number: index + 1,
        par,
        yardage: exactSource?.yardage ?? (teeSelection === MANUAL_TEE ? null : source?.yardage ?? null),
        hole_handicap: source?.handicap ?? null,
        entering_zone_target: par ? par - 2 : null,
        entering_zone_actual: null,
        entering_zone_point: null,
        down_zone_target: 3,
        down_zone_actual: null,
        down_zone_point: null,
        score: null,
        player_scores: Object.fromEntries(guestPlayers.map((player) => [player.id, null])),
        putts: null,
        inside_4ft_result: '',
        made_putt_length_ft: null,
        penalty_strokes: 0,
        tee_result: '',
        club_used_off_tee: '',
        gir: '',
        chips_pitches: null,
        up_down: '',
        plan: null,
        routine: null,
        commit: null,
        smart_decision: null,
        reset: null,
        notes: '',
        updated_at: now,
      }
    })

    const round: Round = {
      id: roundId,
      course_id: course.id,
      course_key: course.course_key,
      course_name: course.name,
      layout: course.layout,
      tee_name: teeName,
      date: now.slice(0, 10),
      started_at: now,
      completed_at: null,
      status: 'in_progress',
      playing_handicap: handicap ? Number(handicap) : null,
      target_score: target ? Number(target) : null,
      primary_focus: focus,
      tracking_config: { ...settings },
      players: cleanedPlayers.length ? cleanedPlayers : DEFAULT_PLAYERS.map((player) => ({ ...player })),
    }
    onStart(round, holes)
  }

  return (
    <main className="page stack">
      <header><p className="eyebrow">New round</p><h1>Set up your round</h1></header>
      <section className="card stack">
        <label className="field"><span>Course</span>
          <select value={courseKey} onChange={(event) => setCourseKey(event.target.value)}>
            {courses.slice().sort((a, b) => a.course_key.localeCompare(b.course_key)).map((item) =>
              <option key={item.id} value={item.course_key}>{item.course_key}</option>)}
          </select>
        </label>

        <label className="field"><span>Tee</span>
          <select value={teeSelection} onChange={(event) => setTeeSelection(event.target.value)}>
            {availableTees.map((tee) => <option key={tee} value={tee}>{tee}</option>)}
            <option value={MANUAL_TEE}>Other / manual tee</option>
          </select>
        </label>

        {teeSelection === MANUAL_TEE && <label className="field"><span>Manual tee name</span>
          <input value={manualTeeName} onChange={(event) => setManualTeeName(event.target.value)} placeholder="White, Blue, Gold…" />
          <small>Par and handicap may be copied from the course’s verified tee. Yardages can be corrected hole by hole during the round.</small>
        </label>}

        {course && (
          <div className="course-summary">
            <strong>{course.city || 'Location not listed'}</strong>
            <span>{teeName || 'Select a tee'} · {teePar ?? '—'} par · {teeYardage ?? 'Manual'} yards</span>
            <span>{matchingHoles.length ? 'Verified hole data available for this tee' : teeSelection === MANUAL_TEE ? 'Manual tee: verify hole information before or during play' : course.data_coverage}</span>
          </div>
        )}

        <button className="secondary" type="button" onClick={onImport}>📷 Import a scorecard photo</button>

        <section className="subsection stack">
          <div className="section-title"><div><h2>Players</h2><p className="muted compact">Your full metrics are tracked. Additional players are score-only.</p></div></div>
          {players.map((player) => (
            <div className="player-row" key={player.id}>
              <label className="field"><span>{player.is_primary ? 'Primary player' : 'Playing partner'}</span>
                <input
                  value={player.name}
                  disabled={player.is_primary}
                  onChange={(event) => updatePlayer(player.id, event.target.value)}
                  placeholder="Player name"
                />
              </label>
              {!player.is_primary && <button type="button" className="icon-button danger-text" onClick={() => removePlayer(player.id)} aria-label={`Remove ${player.name || 'player'}`}>Remove</button>}
            </div>
          ))}
          <button type="button" className="secondary" onClick={addPlayer}>＋ Add another player</button>
        </section>

        <div className="two-col">
          <label className="field"><span>Playing handicap</span><input inputMode="numeric" type="number" value={handicap} onChange={(event) => setHandicap(event.target.value)} /></label>
          <label className="field"><span>Target score</span><input inputMode="numeric" type="number" value={target} onChange={(event) => setTarget(event.target.value)} /></label>
        </div>
        <label className="field"><span>Primary focus</span><input value={focus} onChange={(event) => setFocus(event.target.value)} /></label>
        <button className="primary large" type="button" disabled={!course || !teeName} onClick={startRound}>Start round</button>
      </section>
    </main>
  )
}
