import { useEffect, useMemo, useState } from 'react'
import type { Course, CourseHole, CourseTee, MetricConfig, Round, HoleResult, Player, PlayerHoleInfo } from '../types'
import { DEFAULT_PLAYERS, PRIMARY_PLAYER_ID } from '../types'

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

function blankGuest(teeName = ''): Player {
  return {
    id: crypto.randomUUID(), name: '', is_primary: false, playing_handicap: null,
    tee_name: teeName, tee_par: null, tee_yardage: null, course_rating: null, course_slope: null,
  }
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
  const [focus, setFocus] = useState(settings.roundFocus || 'Avoid blow-up holes')
  const [players, setPlayers] = useState<Player[]>(DEFAULT_PLAYERS.map((player) => ({ ...player })))

  const course = useMemo(() => courses.find((item) => item.course_key === courseKey), [courses, courseKey])
  const availableTees = useMemo(() => {
    const byName = new Map<string, CourseTee>()
    courseTees.filter((tee) => tee.course_key === courseKey).forEach((tee) => byName.set(tee.tee_name, tee))
    courseHoles.filter((hole) => hole.course_key === courseKey && hole.tee_name).forEach((hole) => {
      if (!byName.has(hole.tee_name)) byName.set(hole.tee_name, {
        id: `hole-derived-${courseKey}-${hole.tee_name}`, course_id: hole.course_id, course_key: courseKey,
        tee_name: hole.tee_name, par: null, total_yardage: null, rating: null, slope: null,
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
    setPlayers((items) => items.map((player) => player.is_primary ? player : { ...player, tee_name: preferred?.tee_name ?? course.default_tee ?? '' }))
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

  const teeChoices = useMemo(() => {
    const map = new Map(availableTees.map((tee) => [tee.tee_name, tee]))
    if (teeName && !map.has(teeName)) map.set(teeName, {
      id: `primary-manual-${teeName}`, course_id: course?.id ?? '', course_key: courseKey, tee_name: teeName,
      par: teePar, total_yardage: teeYardage, rating: teeRating, slope: teeSlope, is_default: false,
    })
    return [...map.values()]
  }, [availableTees, course?.id, courseKey, teeName, teePar, teeYardage, teeRating, teeSlope])

  function teeMeta(name: string): CourseTee | undefined { return teeChoices.find((tee) => tee.tee_name === name) }
  function addPlayer() { setPlayers((items) => [...items, blankGuest(teeName)]) }
  function updatePlayer(id: string, patch: Partial<Player>) { setPlayers((items) => items.map((player) => player.id === id ? { ...player, ...patch } : player)) }
  function removePlayer(id: string) { setPlayers((items) => items.filter((player) => player.id !== id)) }

  function startRound() {
    if (!course || !teeName) return
    const primary: Player = {
      id: PRIMARY_PLAYER_ID, name: 'You', is_primary: true,
      playing_handicap: handicap ? Number(handicap) : null,
      tee_name: teeName, tee_par: teePar, tee_yardage: teeYardage,
      course_rating: teeRating, course_slope: teeSlope,
    }
    const guests = players.filter((player) => !player.is_primary && player.name.trim()).map((player) => {
      const resolvedTeeName = player.tee_name || teeName
      const meta = teeMeta(resolvedTeeName)
      return {
        ...player, name: player.name.trim(), tee_name: resolvedTeeName,
        tee_par: meta?.par ?? null, tee_yardage: meta?.total_yardage ?? null,
        course_rating: meta?.rating ?? null, course_slope: meta?.slope ?? null,
      }
    })
    const cleanedPlayers = [primary, ...guests]
    const roundId = crypto.randomUUID()
    const now = new Date().toISOString()
    const holeCountSource = matchingHoles.length ? matchingHoles : fallbackHoles
    const holeCount = holeCountSource.length ? Math.max(...holeCountSource.map((hole) => hole.hole_number)) : course.hole_count === 9 ? 9 : 18
    const genderedTee = /ladies|women/i.test(teeName)
    const canReusePar = !genderedTee && teePar != null && teePar === (fallbackTeeMeta?.par ?? course.course_par)

    const holes: HoleResult[] = Array.from({ length: holeCount }, (_, index) => {
      const holeNumber = index + 1
      const exactSource = matchingHoles.find((hole) => hole.hole_number === holeNumber)
      const fallbackSource = fallbackHoles.find((hole) => hole.hole_number === holeNumber)
      const par = exactSource?.par ?? (canReusePar ? fallbackSource?.par ?? null : null)
      const primaryInfo: PlayerHoleInfo = {
        par,
        yardage: exactSource?.yardage ?? null,
        handicap: exactSource?.handicap ?? (!genderedTee ? fallbackSource?.handicap ?? null : null),
      }
      const playerHoleInfo = Object.fromEntries(guests.map((player) => {
        const guestExact = courseHoles.find((item) => item.course_key === courseKey && item.tee_name === player.tee_name && item.hole_number === holeNumber)
        return [player.id, {
          par: guestExact?.par ?? primaryInfo.par,
          yardage: guestExact?.yardage ?? null,
          handicap: guestExact?.handicap ?? primaryInfo.handicap,
        } satisfies PlayerHoleInfo]
      }))
      return {
        id: crypto.randomUUID(), round_id: roundId, hole_number: holeNumber,
        par: primaryInfo.par, yardage: primaryInfo.yardage, hole_handicap: primaryInfo.handicap,
        entering_zone_target: par ? par - 2 : null, entering_zone_actual: null, entering_zone_point: null,
        down_zone_target: 3, down_zone_actual: null, down_zone_point: null, score: null,
        player_scores: Object.fromEntries(guests.map((player) => [player.id, null])), player_hole_info: playerHoleInfo,
        putts: null, inside_4ft_result: '', made_putt_length_ft: null, penalty_strokes: 0, tee_result: '', club_used_off_tee: '',
        gir: '', chips_pitches: null, up_down: '', plan: null, routine: null, commit: null, smart_decision: null,
        reset: null, notes: '', updated_at: now,
      }
    })

    const round: Round = {
      id: roundId, course_id: course.id, course_key: course.course_key, course_name: course.name, layout: course.layout,
      tee_name: teeName, tee_par: teePar, tee_yardage: teeYardage, course_rating: teeRating, course_slope: teeSlope,
      date: now.slice(0, 10), started_at: now, completed_at: null, status: 'in_progress',
      playing_handicap: primary.playing_handicap, target_score: target ? Number(target) : null,
      primary_focus: focus, tracking_config: { ...settings }, players: cleanedPlayers,
    }
    onStart(round, holes)
  }

  return (
    <main className="page stack">
      <header><p className="eyebrow">New round</p><h1>Set up your round</h1></header>
      <section className="card stack">
        <label className="field"><span>Course</span><select value={courseKey} onChange={(event) => setCourseKey(event.target.value)}>{courses.slice().sort((a, b) => a.course_key.localeCompare(b.course_key)).map((item) => <option key={item.id} value={item.course_key}>{item.course_key}</option>)}</select></label>
        <label className="field"><span>Your tee</span><select value={teeSelection} onChange={(event) => setTeeSelection(event.target.value)}>{availableTees.map((tee) => <option key={tee.id} value={tee.tee_name}>{tee.tee_name}{tee.total_yardage ? ` · ${tee.total_yardage} yd` : ''}</option>)}<option value={MANUAL_TEE}>Other / manual tee</option></select></label>

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
          <span>{hasExactHoleData ? 'Hole-by-hole par, yardage and handicap are available for this tee.' : 'Tee totals are available; verify hole-level information before or during play.'}</span>
        </div>}

        <button className="secondary" type="button" onClick={onImport}>📷 Import a scorecard photo</button>
        <section className="subsection stack">
          <div className="section-title"><div><h2>Players</h2><p className="muted compact">Choose a tee and playing handicap for each golfer. Additional players remain score-only.</p></div></div>
          <div className="player-card primary-player-card">
            <div className="player-card-title"><strong>You</strong><span>{teeName || 'Select tee'}</span></div>
            <label className="field"><span>Playing handicap</span><input inputMode="numeric" type="number" value={handicap} onChange={(event) => setHandicap(event.target.value)} /></label>
          </div>
          {players.filter((player) => !player.is_primary).map((player) => <div className="player-card" key={player.id}>
            <div className="player-card-title"><strong>Playing partner</strong><button type="button" className="text-button danger-text" onClick={() => removePlayer(player.id)}>Remove</button></div>
            <label className="field"><span>Name</span><input value={player.name} onChange={(event) => updatePlayer(player.id, { name: event.target.value })} placeholder="Player name" /></label>
            <div className="two-col">
              <label className="field"><span>Tee</span><select value={player.tee_name || teeName} onChange={(event) => updatePlayer(player.id, { tee_name: event.target.value })}>{teeChoices.map((tee) => <option key={tee.id} value={tee.tee_name}>{tee.tee_name}{tee.total_yardage ? ` · ${tee.total_yardage} yd` : ''}</option>)}</select></label>
              <label className="field"><span>Playing handicap</span><input inputMode="numeric" type="number" value={player.playing_handicap ?? ''} onChange={(event) => updatePlayer(player.id, { playing_handicap: event.target.value === '' ? null : Number(event.target.value) })} /></label>
            </div>
          </div>)}
          <button type="button" className="secondary" onClick={addPlayer}>＋ Add another player</button>
        </section>
        <label className="field"><span>Target score</span><input inputMode="numeric" type="number" value={target} onChange={(event) => setTarget(event.target.value)} /></label>
        <label className="field"><span>Round focus</span><input value={focus} maxLength={140} onChange={(event) => setFocus(event.target.value)} /><small>Prefilled from Settings and shown after every hole.</small></label>
        <button className="primary large" type="button" disabled={!course || !teeName} onClick={startRound}>Start round</button>
      </section>
    </main>
  )
}
