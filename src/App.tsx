import { useEffect, useMemo, useState } from 'react'
import type { Course, CourseHole, HoleResult, MetricConfig, Round, Screen, SyncState } from './types'
import { DEFAULT_METRICS } from './types'
import { initializeAppData, listRounds, loadRoundBundle, saveImportedCourse, saveMetricSettings, saveRoundAndHoles } from './lib/dataService'
import RoundSetup from './components/RoundSetup'
import HoleEntry from './components/HoleEntry'
import ScorecardImport from './components/ScorecardImport'
import Settings from './components/Settings'
import SyncBadge from './components/SyncBadge'

function calculateRound(round: Round, holes: HoleResult[]): Round {
  const scored = holes.filter((hole) => hole.score != null)
  const totalScore = scored.reduce((sum, hole) => sum + Number(hole.score), 0)
  const totalPar = scored.reduce((sum, hole) => sum + Number(hole.par ?? 0), 0)
  const methodValues = holes.flatMap((hole) => [hole.plan,hole.routine,hole.commit,hole.smart_decision,hole.reset]).filter((v): v is 0 | 1 => v != null)
  const zoneValues = holes.flatMap((hole) => [hole.entering_zone_point,hole.down_zone_point]).filter((v): v is number => v != null)
  return { ...round, total_score: scored.length ? totalScore : null, to_par: scored.length ? totalScore - totalPar : null, method_pct: methodValues.length ? methodValues.reduce<number>((a,b)=>a+b,0)/methodValues.length : null, scoring_zone_pct: zoneValues.length ? zoneValues.reduce<number>((a,b)=>a+b,0)/zoneValues.length : null }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [courseHoles, setCourseHoles] = useState<CourseHole[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [settings, setSettings] = useState<MetricConfig>(DEFAULT_METRICS)
  const [activeRound, setActiveRound] = useState<Round | null>(null)
  const [holes, setHoles] = useState<HoleResult[]>([])
  const [holeIndex, setHoleIndex] = useState(0)
  const [syncState, setSyncState] = useState<SyncState>('local-only')
  const [cloudMessage, setCloudMessage] = useState<string | null>(null)

  useEffect(() => {
    initializeAppData().then(async (data) => {
      setCourses(data.courses); setCourseHoles(data.courseHoles); setRounds(data.rounds); setSettings(data.settings)
      setSyncState(data.cloudUserId ? 'saved' : navigator.onLine ? 'local-only' : 'offline')
      setCloudMessage(data.cloudError)
      if (data.activeRoundId) {
        const bundle = await loadRoundBundle(data.activeRoundId)
        if (bundle.round && bundle.holes.length) { setActiveRound(bundle.round); setHoles(bundle.holes) }
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const online = () => setSyncState((state) => state === 'offline' ? 'saving' : state)
    const offline = () => setSyncState('offline')
    window.addEventListener('online', online); window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [])

  const activeHole = holes[holeIndex]
  const completedCount = useMemo(() => holes.filter((hole) => hole.score != null).length, [holes])

  async function persistRound(round = activeRound, nextHoles = holes) {
    if (!round) return
    setSyncState('saving')
    const calculated = calculateRound(round, nextHoles)
    setActiveRound(calculated)
    const state = await saveRoundAndHoles(calculated, nextHoles)
    setSyncState(state)
    setRounds(await listRounds())
  }

  async function startRound(round: Round, newHoles: HoleResult[]) {
    setActiveRound(round); setHoles(newHoles); setHoleIndex(0); setScreen('round')
    setSyncState('saving')
    setSyncState(await saveRoundAndHoles(round, newHoles))
    setRounds(await listRounds())
  }

  function updateHole(updated: HoleResult) {
    const next = holes.map((hole) => hole.id === updated.id ? updated : hole)
    setHoles(next)
    void persistRound(activeRound, next)
  }

  async function finishRound() {
    if (!activeRound) return
    const completed = calculateRound({ ...activeRound, status: 'complete', completed_at: new Date().toISOString() }, holes)
    setActiveRound(null); setScreen('history'); setSyncState('saving')
    setSyncState(await saveRoundAndHoles(completed, holes)); setRounds(await listRounds())
  }

  async function resumeRound() {
    if (!activeRound) return
    const firstOpen = holes.findIndex((hole) => hole.score == null)
    setHoleIndex(firstOpen >= 0 ? firstOpen : 17); setScreen('round')
  }

  async function importCourse(draft: Parameters<typeof saveImportedCourse>[0]): Promise<SyncState> {
    const result = await saveImportedCourse(draft)
    setCourses((items) => [result.course, ...items.filter((item) => item.course_key !== result.course.course_key)])
    setCourseHoles((items) => [...result.holes, ...items.filter((item) => item.course_key !== result.course.course_key)])
    return result.sync
  }

  async function saveSettingsNow() { setSyncState('saving'); setSyncState(await saveMetricSettings(settings)) }

  if (loading) return <main className="loading-screen"><div className="golf-ball">⛳</div><h1>Loading scorecard…</h1></main>

  return <div className="app-shell">
    {screen === 'home' && <main className="page stack home-page"><header className="brand"><div><p className="eyebrow">Golf Method</p><h1>Play the next shot well.</h1></div><SyncBadge state={syncState} /></header>{cloudMessage && <div className="notice warning"><strong>Cloud sync is not active</strong><span>{cloudMessage} The app will continue saving on this phone.</span></div>}{activeRound && <section className="card resume-card"><div><p className="eyebrow">Round in progress</p><h2>{activeRound.course_name}</h2><p>{completedCount}/18 holes scored</p></div><button className="primary" onClick={resumeRound}>Resume</button></section>}<section className="home-actions"><button className="home-action primary" onClick={() => setScreen('setup')}><span>＋</span><strong>Start a round</strong><small>Select a course and begin scoring.</small></button><button className="home-action" onClick={() => setScreen('import')}><span>📷</span><strong>Import scorecard</strong><small>Extract course and hole information from a photo.</small></button></section><section className="card"><div className="section-title"><h2>Recent rounds</h2><button className="text-button" onClick={() => setScreen('history')}>View all</button></div>{rounds.slice(0,3).length ? rounds.slice(0,3).map((round) => <div className="history-row" key={round.id}><div><strong>{round.course_name}</strong><span>{round.date} · {round.tee_name}</span></div><b>{round.total_score ?? '—'}</b></div>) : <p className="muted">Your completed rounds will appear here.</p>}</section></main>}
    {screen === 'setup' && <RoundSetup courses={courses} courseHoles={courseHoles} settings={settings} onStart={startRound} onImport={() => setScreen('import')} />}
    {screen === 'round' && activeRound && activeHole && <HoleEntry round={activeRound} hole={activeHole} holeIndex={holeIndex} totalHoles={holes.length} settings={activeRound.tracking_config} syncState={syncState} onChange={updateHole} onPrevious={() => { void persistRound(); setHoleIndex((i) => Math.max(0, i-1)) }} onNext={() => { void persistRound(); setHoleIndex((i) => Math.min(holes.length-1, i+1)); window.scrollTo({top:0,behavior:'smooth'}) }} onFinish={finishRound} />}
    {screen === 'import' && <ScorecardImport onSave={importCourse} onDone={() => setScreen('setup')} />}
    {screen === 'settings' && <Settings settings={settings} sync={syncState} onChange={setSettings} onSave={saveSettingsNow} />}
    {screen === 'history' && <main className="page stack"><header><p className="eyebrow">Round archive</p><h1>History</h1></header>{rounds.length ? rounds.map((round) => <section className="card round-history" key={round.id}><div><strong>{round.course_name}</strong><span>{round.date} · {round.tee_name}</span><small>{round.status === 'complete' ? 'Completed' : 'In progress'}</small></div><div className="round-score"><b>{round.total_score ?? '—'}</b><span>{round.to_par == null ? '' : `${round.to_par > 0 ? '+' : ''}${round.to_par}`}</span></div></section>) : <section className="card"><p>No rounds saved yet.</p></section>}</main>}
    {screen !== 'round' && <nav className="bottom-nav"><button className={screen === 'home' ? 'active' : ''} onClick={() => setScreen('home')}><span>⌂</span>Home</button><button className={screen === 'setup' ? 'active' : ''} onClick={() => setScreen('setup')}><span>＋</span>Round</button><button className={screen === 'history' ? 'active' : ''} onClick={() => setScreen('history')}><span>▤</span>History</button><button className={screen === 'settings' ? 'active' : ''} onClick={() => setScreen('settings')}><span>⚙</span>Settings</button></nav>}
  </div>
}
