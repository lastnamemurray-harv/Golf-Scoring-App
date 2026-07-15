import { del, get, set } from 'idb-keyval'
import type { Course, CourseHole, CourseTee, MetricConfig, Round, HoleResult } from '../types'
import { DEFAULT_METRICS } from '../types'

const KEYS = {
  courses: 'golf:courses',
  courseHoles: 'golf:course-holes',
  courseTees: 'golf:course-tees',
  settings: 'golf:metric-settings',
  rounds: 'golf:rounds',
  activeRound: 'golf:active-round-id',
  holesPrefix: 'golf:round-holes:',
  pendingRoundDeletes: 'golf:pending-round-deletes',
}

export async function loadCourses(): Promise<Course[]> {
  return (await get<Course[]>(KEYS.courses)) ?? []
}
export async function saveCourses(courses: Course[]): Promise<void> { await set(KEYS.courses, courses) }
export async function loadCourseHoles(): Promise<CourseHole[]> { return (await get<CourseHole[]>(KEYS.courseHoles)) ?? [] }
export async function saveCourseHoles(holes: CourseHole[]): Promise<void> { await set(KEYS.courseHoles, holes) }
export async function loadCourseTees(): Promise<CourseTee[]> { return (await get<CourseTee[]>(KEYS.courseTees)) ?? [] }
export async function saveCourseTees(tees: CourseTee[]): Promise<void> { await set(KEYS.courseTees, tees) }

export async function loadSettings(): Promise<MetricConfig> {
  return { ...DEFAULT_METRICS, ...((await get<Partial<MetricConfig>>(KEYS.settings)) ?? {}) }
}
export async function saveSettings(settings: MetricConfig): Promise<void> { await set(KEYS.settings, settings) }

export async function loadRounds(): Promise<Round[]> { return (await get<Round[]>(KEYS.rounds)) ?? [] }
export async function saveRounds(rounds: Round[]): Promise<void> { await set(KEYS.rounds, rounds) }
export async function upsertLocalRound(round: Round): Promise<void> {
  const rounds = await loadRounds()
  const next = [round, ...rounds.filter((item) => item.id !== round.id)]
  await saveRounds(next)
}
export async function deleteLocalRound(roundId: string): Promise<void> {
  const rounds = await loadRounds()
  await saveRounds(rounds.filter((round) => round.id !== roundId))
  await del(KEYS.holesPrefix + roundId)
  const activeRoundId = await getActiveRoundId()
  if (activeRoundId === roundId) await setActiveRoundId(null)
}
export async function saveLocalHoleResults(roundId: string, holes: HoleResult[]): Promise<void> {
  await set(KEYS.holesPrefix + roundId, holes)
}
export async function loadLocalHoleResults(roundId: string): Promise<HoleResult[]> {
  return (await get<HoleResult[]>(KEYS.holesPrefix + roundId)) ?? []
}
export async function setActiveRoundId(roundId: string | null): Promise<void> { await set(KEYS.activeRound, roundId) }
export async function getActiveRoundId(): Promise<string | null> { return (await get<string>(KEYS.activeRound)) ?? null }

export async function loadPendingRoundDeletes(): Promise<string[]> { return (await get<string[]>(KEYS.pendingRoundDeletes)) ?? [] }
export async function queuePendingRoundDelete(roundId: string): Promise<void> {
  const ids = await loadPendingRoundDeletes()
  if (!ids.includes(roundId)) await set(KEYS.pendingRoundDeletes, [...ids, roundId])
}
export async function clearPendingRoundDelete(roundId: string): Promise<void> {
  const ids = await loadPendingRoundDeletes()
  await set(KEYS.pendingRoundDeletes, ids.filter((id) => id !== roundId))
}
