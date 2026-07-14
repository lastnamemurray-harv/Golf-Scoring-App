import { useMemo, useState } from 'react'
import type { Course, CourseHole, MetricConfig, Round, HoleResult } from '../types'

interface Props {
  courses: Course[]
  courseHoles: CourseHole[]
  settings: MetricConfig
  onStart: (round: Round, holes: HoleResult[]) => void
  onImport: () => void
}

export default function RoundSetup({ courses, courseHoles, settings, onStart, onImport }: Props) {
  const [courseKey, setCourseKey] = useState(courses[0]?.course_key ?? '')
  const [handicap, setHandicap] = useState<string>('')
  const [target, setTarget] = useState<string>('')
  const [focus, setFocus] = useState('Avoid blow-up holes')
  const course = useMemo(() => courses.find((item) => item.course_key === courseKey), [courses, courseKey])

  function startRound() {
    if (!course) return
    const roundId = crypto.randomUUID()
    const now = new Date().toISOString()
    const matching = courseHoles
      .filter((hole) => hole.course_key === course.course_key && hole.tee_name === course.default_tee)
      .sort((a, b) => a.hole_number - b.hole_number)
    const holes: HoleResult[] = Array.from({ length: 18 }, (_, index) => {
      const source = matching.find((hole) => hole.hole_number === index + 1)
      const par = source?.par ?? null
      return {
        id: crypto.randomUUID(), round_id: roundId, hole_number: index + 1,
        par, yardage: source?.yardage ?? null, hole_handicap: source?.handicap ?? null,
        entering_zone_target: par ? par - 2 : null, entering_zone_actual: null, entering_zone_point: null,
        down_zone_target: 3, down_zone_actual: null, down_zone_point: null,
        score: null, putts: null, inside_4ft_result: '', made_putt_length_ft: null,
        penalty_strokes: 0, tee_result: '', club_used_off_tee: '', gir: '', chips_pitches: null, up_down: '',
        plan: null, routine: null, commit: null, smart_decision: null, reset: null, notes: '', updated_at: now,
      }
    })
    const round: Round = {
      id: roundId, course_id: course.id, course_key: course.course_key, course_name: course.name,
      layout: course.layout, tee_name: course.default_tee || 'Manual', date: now.slice(0, 10), started_at: now,
      completed_at: null, status: 'in_progress', playing_handicap: handicap ? Number(handicap) : null,
      target_score: target ? Number(target) : null, primary_focus: focus, tracking_config: { ...settings },
    }
    onStart(round, holes)
  }

  return (
    <main className="page stack">
      <header><p className="eyebrow">New round</p><h1>Set up your round</h1></header>
      <section className="card stack">
        <label className="field"><span>Course</span>
          <select value={courseKey} onChange={(e) => setCourseKey(e.target.value)}>
            {courses.slice().sort((a,b) => a.name.localeCompare(b.name)).map((item) =>
              <option key={item.id} value={item.course_key}>{item.course_key}</option>)}
          </select>
        </label>
        {course && (
          <div className="course-summary">
            <strong>{course.city || 'Location not listed'}</strong>
            <span>{course.default_tee || 'Manual tee'} · {course.course_par ?? '—'} par · {course.total_yardage ?? '—'} yards</span>
            <span>{course.data_coverage}</span>
          </div>
        )}
        <button className="secondary" type="button" onClick={onImport}>📷 Import a scorecard photo</button>
        <div className="two-col">
          <label className="field"><span>Playing handicap</span><input inputMode="numeric" type="number" value={handicap} onChange={(e) => setHandicap(e.target.value)} /></label>
          <label className="field"><span>Target score</span><input inputMode="numeric" type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
        </div>
        <label className="field"><span>Primary focus</span><input value={focus} onChange={(e) => setFocus(e.target.value)} /></label>
        <button className="primary large" type="button" onClick={startRound}>Start round</button>
      </section>
    </main>
  )
}
