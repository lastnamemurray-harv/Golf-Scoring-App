import { useEffect, useMemo, useState } from 'react'
import type { Course, CourseHole, HoleResult, MetricConfig, Round, Screen, SyncState } from './types'
import { DEFAULT_METRICS } from './types'
import {
  deleteRound as deleteRoundData,
  initializeAppData,
  listRounds,
  loadRoundBundle,
  saveImportedCourse,
  saveMetricSettings,
  saveRoundAndHoles,
} from './lib/dataService'
import RoundSetup from './components/RoundSetup'
import HoleEntry from './components/HoleEntry'
import ScorecardImport from './components/ScorecardImport'
import ScorecardView from './components/ScorecardView'
import Settings from './components/Settings'
import SyncBadge from './components/SyncBadge'

function calculateRound(round: Round, holes: HoleResult[]): Round {
  const scored = holes.filter((hole) => hole.score != null)
  const totalScore = scored.reduce((sum, hole) => sum + Number(hole.score), 0)
  const totalPar = scored.reduce((sum, hole) => sum + Number(hole.par ?? 0), 0)
  const methodValues = holes
    .flatMap((hole) => [hole.plan, hole.routine, hole.commit, hole.smart_decision, hole.reset])
    .filter((value): value is 0 | 1 => value != null)
  const zoneValues = holes
    .flatMap((hole) => [hole.entering_zone_point, hole.down_zone_point])
    .filter((value): value is number => value != null)
  return {
    ...round,
    total_score: scored.length ? totalScore : null,
    to_par: scored.length ? totalScore - totalPar : null,
    method_pct: methodValues.length ? methodValues.reduce<number>((a, b) => a + b, 0) / methodValues.length : null,
    scoring_zone_pct: zoneValues.length ? zoneValues.reduce<number>((a, b) => a + b, 0) / zoneValues.length : null,
  }
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
  const [scorecardRound, setScorecardRound] = useState<Round | null>(null)
  const [scorecardHoles, setScorecardHoles] = useState<HoleResult[]>([])
  const [scorecardReturn, setScorecardReturn] = useState<'round' | 'history' | 'home'>('history')
  const [syncState, setSyncState] = useState<SyncState>('local-only')
  const [cloudMessage, setCloudMessage] = useState<string | null>(null)

  useEffect(() => {
    initializeAppData().then(async (data) => {
      setCourses(data.courses)
      setCourseHoles(data.courseHoles)
      setRounds(data.rounds)
      setSettings(data.settings)
      setSyncState(data.cloudUserId ? 'saved' : navigator.onLine ? 'local-only' : 'offline')
      setCloudMessage(data.cloudError)
      if (data.activeRoundId) {
        const bundle = await loadRoundBundle(data.activeRoundId)
        if (bundle.round && bundle.holes.length) {
          setActiveRound(bundle.round)
          setHoles(bundle.holes)
        }
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const online = () => setSyncState((state) => state === 'offline' ? 'saving' : state)
    const offline = () => setSyncState('offline')
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  const activeHole = holes[holeIndex]
  const completedCount = useMemo(() => holes.filter((hole) => hole.score != null).length, [holes])

  async function refreshRounds() {
    setRounds(await listRounds())
  }

  async function persistRound(round = activeRound, nextHoles = holes) {
    if (!round) return
    setSyncState('saving')
    const calculated = calculateRound(round, nextHoles)
    setActiveRound(calculated)
    const state = await saveRoundAndHoles(calculated, nextHoles)
    setSyncState(state)
    await refreshRounds()
  }

  async function startRound(round: Round, newHoles: HoleResult[]) {
    setActiveRound(round)
    setHoles(newHoles)
    setHoleIndex(0)
    setScreen('round')
    setSyncState('saving')
    setSyncState(await saveRoundAndHoles(round, newHoles))
    await refreshRounds()
  }

  function updateHole(updated: HoleResult) {
    const next = holes.map((hole) => hole.id === updated.id ? updated : hole)
    setHoles(next)
    void persistRound(activeRound, next)
  }

  async function finishRound() {
    if (!activeRound) return
    const completed = calculateRound({ ...activeRound, status: 'complete', completed_at: new Date().toISOString() }, holes)
    setSyncState('saving')
    setSyncState(await saveRoundAndHoles(completed, holes))
    setActiveRound(null)
    setHoles([])
    setScreen('history')
    await refreshRounds()
  }

  async function resumeActiveRound() {
    if (!activeRound) return
    const firstOpen = holes.findIndex((hole) => hole.score == null)
    setHoleIndex(firstOpen >= 0 ? firstOpen : Math.max(0, holes.length - 1))
    setScreen('round')
  }

  async function resumeSavedRound(roundId: string) {
    const bundle = await loadRoundBundle(roundId)
    if (!bundle.round || !bundle.holes.length) return
    setActiveRound(bundle.round)
    setHoles(bundle.holes)
    const firstOpen = bundle.holes.findIndex((hole) => hole.score == null)
    setHoleIndex(firstOpen >= 0 ? firstOpen : Math.max(0, bundle.holes.length - 1))
    setScreen('round')
    await saveRoundAndHoles(bundle.round, bundle.holes)
  }

  function openActiveScorecard(returnTo: 'round' | 'home' = 'round') {
    if (!activeRound) return
    setScorecardRound(calculateRound(activeRound, holes))
    setScorecardHoles(holes)
    setScorecardReturn(returnTo)
    setScreen('scorecard')
  }

  async function openSavedScorecard(round: Round) {
    const bundle = await loadRoundBundle(round.id)
    setScorecardRound(bundle.round ?? round)
    setScorecardHoles(bundle.holes)
    setScorecardReturn('history')
    setScreen('scorecard')
  }

  function closeScorecard() {
    setScreen(scorecardReturn)
  }

  async function removeRound(round: Round) {
    const descriptor = round.status === 'complete' ? 'saved round' : 'partially completed round'
    if (!window.confirm(`Delete this ${descriptor} at ${round.course_name}? This cannot be undone.`)) return
    const returnScreen: Screen = screen === 'history' || (screen === 'scorecard' && scorecardReturn === 'history') ? 'history' : 'home'
    setSyncState('saving')
    const state = await deleteRoundData(round.id)
    setSyncState(state)
    if (activeRound?.id === round.id) {
      setActiveRound(null)
      setHoles([])
      setHoleIndex(0)
    }
    if (scorecardRound?.id === round.id) {
      setScorecardRound(null)
      setScorecardHoles([])
    }
    await refreshRounds()
    setScreen(returnScreen)
  }

  async function importCourse(draft: Parameters<typeof saveImportedCourse>[0]): Promise<SyncState> {
    const result = await saveImportedCourse(draft)
    setCourses((items) => [result.course, ...items.filter((item) => item.course_key !== result.course.course_key)])
    setCourseHoles((items) => [...result.holes, ...items.filter((item) => item.course_key !== result.course.course_key)])
    return result.sync
  }

  async function saveSettingsNow() {
    setSyncState('saving')
    setSyncState(await saveMetricSettings(settings))
  }

  if (loading) return <main className="loading-screen"><div className="golf-ball">⛳</div><h1>Loading scorecard…</h1></main>

  return <div className="app-shell">
    {screen === 'home' && <main className="page stack home-page">
      <header className="brand"><div><p className="eyebrow">Golf Method</p><h1>Play the next shot well.</h1></div><SyncBadge state={syncState} /></header>
      {cloudMessage && <div className="notice warning"><strong>Cloud sync is not active</strong><span>{cloudMessage} The app will continue saving on this phone.</span></div>}
      {activeRound && <section className="card resume-card">
        <div><p className="eyebrow">Round in progress</p><h2>{activeRound.course_name}</h2><p>{completedCount}/{holes.length || 18} holes scored · {activeRound.tee_name}</p></div>
        <div className="resume-actions">
          <button className="primary" onClick={resumeActiveRound}>Resume</button>
          <button className="secondary" onClick={() => openActiveScorecard('home')}>Scorecard</button>
          <button className="text-button danger-text" onClick={() => removeRound(activeRound)}>Delete</button>
        </div>
      </section>}
      <section className="home-actions">
        <button className="home-action primary" onClick={() => setScreen('setup')}><span>＋</span><strong>Start a round</strong><small>Select a course, tee and players.</small></button>
        <button className="home-action" onClick={() => setScreen('import')}><span>📷</span><strong>Import scorecard</strong><small>Extract course and hole information from a photo.</small></button>
      </section>
      <section className="card">
        <div className="section-title"><h2>Recent rounds</h2><button className="text-button" onClick={() => setScreen('history')}>View all</button></div>
        {rounds.slice(0, 3).length
          ? rounds.slice(0, 3).map((round) => <div className="history-row" key={round.id}><div><strong>{round.course_name}</strong><span>{round.date} · {round.tee_name}</span></div><b>{round.total_score ?? '—'}</b></div>)
          : <p className="muted">Your rounds will appear here.</p>}
      </section>
    </main>}

    {screen === 'setup' && <RoundSetup courses={courses} courseHoles={courseHoles} settings={settings} onStart={startRound} onImport={() => setScreen('import')} />}

    {screen === 'round' && activeRound && activeHole && <HoleEntry
      round={activeRound}
      hole={activeHole}
      holeIndex={holeIndex}
      totalHoles={holes.length}
      settings={activeRound.tracking_config}
      syncState={syncState}
      onChange={updateHole}
      onHome={() => { void persistRound(); setScreen('home') }}
      onScorecard={() => { void persistRound(); openActiveScorecard('round') }}
      onPrevious={() => { void persistRound(); setHoleIndex((index) => Math.max(0, index - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
      onNext={() => { void persistRound(); setHoleIndex((index) => Math.min(holes.length - 1, index + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
      onFinish={finishRound}
    />}

    {screen === 'scorecard' && scorecardRound && <ScorecardView
      round={scorecardRound}
      holes={scorecardHoles}
      active={activeRound?.id === scorecardRound.id && scorecardRound.status === 'in_progress'}
      onBack={closeScorecard}
      onHome={() => setScreen('home')}
      onSelectHole={activeRound?.id === scorecardRound.id ? (index) => { setHoleIndex(index); setScreen('round'); window.scrollTo({ top: 0 }) } : undefined}
      onDelete={() => removeRound(scorecardRound)}
    />}

    {screen === 'import' && <ScorecardImport onSave={importCourse} onDone={() => setScreen('setup')} />}
    {screen === 'settings' && <Settings settings={settings} sync={syncState} onChange={setSettings} onSave={saveSettingsNow} />}

    {screen === 'history' && <main className="page stack">
      <header><p className="eyebrow">Round archive</p><h1>History</h1></header>
      {rounds.length ? rounds.map((round) => <section className="card round-history" key={round.id}>
        <div><strong>{round.course_name}</strong><span>{round.date} · {round.tee_name}</span><small>{round.status === 'complete' ? 'Completed' : 'In progress'} · {round.players.length} player{round.players.length === 1 ? '' : 's'}</small></div>
        <div className="history-card-actions">
          <div className="round-score"><b>{round.total_score ?? '—'}</b><span>{round.to_par == null ? '' : `${round.to_par > 0 ? '+' : ''}${round.to_par}`}</span></div>
          <button type="button" className="secondary compact-button" onClick={() => openSavedScorecard(round)}>View</button>
          {round.status === 'in_progress' && <button type="button" className="primary compact-button" onClick={() => resumeSavedRound(round.id)}>Resume</button>}
          <button type="button" className="text-button danger-text" onClick={() => removeRound(round)}>Delete</button>
        </div>
      </section>) : <section className="card"><p>No rounds saved yet.</p></section>}
    </main>}

    {screen !== 'round' && screen !== 'scorecard' && <nav className="bottom-nav">
      <button className={screen === 'home' ? 'active' : ''} onClick={() => setScreen('home')}><span>⌂</span>Home</button>
      <button className={screen === 'setup' ? 'active' : ''} onClick={() => setScreen('setup')}><span>＋</span>Round</button>
      <button className={screen === 'history' ? 'active' : ''} onClick={() => setScreen('history')}><span>▤</span>History</button>
      <button className={screen === 'settings' ? 'active' : ''} onClick={() => setScreen('settings')}><span>⚙</span>Settings</button>
    </nav>}
  </div>
}
