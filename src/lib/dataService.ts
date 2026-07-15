import seedData from '../data/seedCourses.json'
import type { Course, CourseHole, CourseTee, HoleResult, ImportedCourseDraft, MetricConfig, Round, SyncState } from '../types'
import { DEFAULT_METRICS, DEFAULT_PLAYERS } from '../types'
import { ensureAnonymousSession, isCloudConfigured, supabase } from './supabase'
import {
  clearPendingRoundDelete, deleteLocalRound, getActiveRoundId, loadCourseHoles, loadCourseTees, loadCourses, loadLocalHoleResults, loadPendingRoundDeletes, loadRounds, loadSettings,
  queuePendingRoundDelete, saveCourseHoles, saveCourseTees, saveCourses, saveLocalHoleResults, saveSettings, setActiveRoundId, upsertLocalRound,
} from './localDb'

export interface AppData {
  courses: Course[]
  courseHoles: CourseHole[]
  courseTees: CourseTee[]
  rounds: Round[]
  settings: MetricConfig
  activeRoundId: string | null
  cloudUserId: string | null
  cloudError: string | null
}

function mergeById<T extends { id: string }>(base: T[], incoming: T[]): T[] {
  const map = new Map(base.map((item) => [item.id, item]))
  incoming.forEach((item) => map.set(item.id, item))
  return [...map.values()]
}

export function normalizeRound(round: Round): Round {
  return {
    ...round,
    tracking_config: { ...DEFAULT_METRICS, ...(round.tracking_config ?? {}) },
    players: Array.isArray(round.players) && round.players.length ? round.players : DEFAULT_PLAYERS.map((player) => ({ ...player })),
  }
}

export function normalizeHole(hole: HoleResult): HoleResult {
  return { ...hole, player_scores: hole.player_scores ?? {} }
}

export async function initializeAppData(): Promise<AppData> {
  let courses = await loadCourses()
  let courseHoles = await loadCourseHoles()
  let courseTees = await loadCourseTees()
  if (!courses.length) {
    courses = seedData.courses as Course[]
    await saveCourses(courses)
  }
  if (!courseHoles.length) {
    courseHoles = seedData.course_holes as CourseHole[]
    await saveCourseHoles(courseHoles)
  }
  if (!courseTees.length) {
    courseTees = seedData.course_tees as CourseTee[]
    await saveCourseTees(courseTees)
  }

  let cloudUserId: string | null = null
  let cloudError: string | null = null
  if (isCloudConfigured && navigator.onLine && supabase) {
    try {
      cloudUserId = await ensureAnonymousSession()
      for (const roundId of await loadPendingRoundDeletes()) {
        const { error: deleteError } = await supabase.from('rounds').delete().eq('id', roundId)
        if (!deleteError) await clearPendingRoundDelete(roundId)
      }
      const [{ data: cloudCourses, error: courseError }, { data: cloudHoles, error: holeError }, { data: cloudTees, error: teeError }, { data: cloudRounds, error: roundsError }] = await Promise.all([
        supabase.from('courses').select('*'),
        supabase.from('course_holes').select('*'),
        supabase.from('course_tees').select('*'),
        supabase.from('rounds').select('*').order('started_at', { ascending: false }),
      ])
      if (courseError) throw courseError
      if (holeError) throw holeError
      if (teeError) throw teeError
      if (roundsError) throw roundsError
      courses = mergeById(courses, (cloudCourses ?? []) as Course[])
      courseHoles = mergeById(courseHoles, (cloudHoles ?? []) as CourseHole[])
      courseTees = mergeById(courseTees, (cloudTees ?? []) as CourseTee[])
      await saveCourses(courses)
      await saveCourseHoles(courseHoles)
      await saveCourseTees(courseTees)
      if (cloudRounds?.length) {
        for (const rawRound of cloudRounds as Round[]) await upsertLocalRound(normalizeRound(rawRound))
      }
      const { data: cloudSettings } = await supabase.from('user_settings').select('metric_config').maybeSingle()
      if (cloudSettings?.metric_config) await saveSettings(cloudSettings.metric_config as MetricConfig)
    } catch (error) {
      cloudError = error instanceof Error ? error.message : 'Cloud sync unavailable.'
    }
  }

  const localRounds = (await loadRounds()).map(normalizeRound)
  for (const round of localRounds) await upsertLocalRound(round)

  return {
    courses,
    courseHoles,
    courseTees,
    rounds: localRounds,
    settings: await loadSettings(),
    activeRoundId: await getActiveRoundId(),
    cloudUserId,
    cloudError,
  }
}

export async function saveMetricSettings(settings: MetricConfig): Promise<SyncState> {
  await saveSettings(settings)
  if (!isCloudConfigured || !supabase) return 'local-only'
  if (!navigator.onLine) return 'offline'
  try {
    const userId = await ensureAnonymousSession()
    if (!userId) return 'local-only'
    const { error } = await supabase.from('user_settings').upsert({ user_id: userId, metric_config: settings })
    if (error) throw error
    return 'saved'
  } catch {
    return 'error'
  }
}

export async function saveImportedCourse(draft: ImportedCourseDraft): Promise<{ course: Course; tee: CourseTee; holes: CourseHole[]; sync: SyncState }> {
  const id = crypto.randomUUID()
  const courseKey = `${draft.name} — ${draft.tee_name}`
  const pars = draft.holes.map((h) => h.par).filter((n): n is number => n !== null)
  const yards = draft.holes.map((h) => h.yardage).filter((n): n is number => n !== null)
  const course: Course = {
    id,
    course_key: courseKey,
    name: draft.name,
    layout: draft.layout,
    city: draft.city,
    address: draft.address,
    access: 'Unknown',
    hole_count: 18,
    default_tee: draft.tee_name,
    course_par: pars.length === 18 ? pars.reduce((a, b) => a + b, 0) : null,
    total_yardage: yards.length === 18 ? yards.reduce((a, b) => a + b, 0) : null,
    rating: draft.rating,
    slope: draft.slope,
    data_coverage: 'User-imported scorecard',
    source_url: '',
    notes: 'Extracted from a photographed scorecard and confirmed by the user.',
    is_public: false,
  }
  const tee: CourseTee = {
    id: crypto.randomUUID(),
    course_id: id,
    course_key: courseKey,
    tee_name: draft.tee_name,
    par: course.course_par,
    total_yardage: course.total_yardage,
    rating: draft.rating,
    slope: draft.slope,
    is_default: true,
    source_url: '',
  }
  const holes: CourseHole[] = draft.holes.map((hole) => ({
    id: crypto.randomUUID(),
    course_id: id,
    course_key: courseKey,
    tee_name: draft.tee_name,
    hole_number: hole.hole_number,
    par: hole.par,
    yardage: hole.yardage,
    handicap: hole.handicap,
    source_url: '',
  }))

  const localCourses = await loadCourses()
  const localTees = await loadCourseTees()
  const localHoles = await loadCourseHoles()
  await saveCourses([course, ...localCourses.filter((c) => c.course_key !== courseKey)])
  await saveCourseTees([tee, ...localTees.filter((item) => !(item.course_key === courseKey && item.tee_name === draft.tee_name))])
  await saveCourseHoles([...holes, ...localHoles.filter((h) => h.course_key !== courseKey)])

  if (!isCloudConfigured || !supabase) return { course, tee, holes, sync: 'local-only' }
  if (!navigator.onLine) return { course, tee, holes, sync: 'offline' }
  try {
    const userId = await ensureAnonymousSession()
    if (!userId) return { course, tee, holes, sync: 'local-only' }
    const { data: existing } = await supabase
      .from('courses')
      .select('id')
      .eq('course_key', courseKey)
      .eq('owner_id', userId)
      .maybeSingle()
    if (existing?.id) {
      course.id = existing.id as string
      holes.forEach((hole) => { hole.course_id = course.id })
      tee.course_id = course.id
    }
    course.owner_id = userId
    tee.owner_id = userId
    const { error: courseError } = await supabase.from('courses').upsert(course)
    if (courseError) throw courseError
    const { error: teeError } = await supabase.from('course_tees').upsert(tee)
    if (teeError) throw teeError
    await supabase.from('course_holes').delete().eq('course_id', course.id).eq('tee_name', draft.tee_name)
    const cloudHoles = holes.map((hole) => ({ ...hole, owner_id: userId }))
    const { error: holeError } = await supabase.from('course_holes').insert(cloudHoles)
    if (holeError) throw holeError
    return { course, tee, holes, sync: 'saved' }
  } catch {
    return { course, tee, holes, sync: 'error' }
  }
}

export async function saveRoundAndHoles(rawRound: Round, rawHoles: HoleResult[]): Promise<SyncState> {
  const round = normalizeRound(rawRound)
  const holes = rawHoles.map(normalizeHole)
  await upsertLocalRound(round)
  await saveLocalHoleResults(round.id, holes)
  await setActiveRoundId(round.status === 'in_progress' ? round.id : null)
  if (!isCloudConfigured || !supabase) return 'local-only'
  if (!navigator.onLine) return 'offline'
  try {
    const userId = await ensureAnonymousSession()
    if (!userId) return 'local-only'
    const roundPayload = { ...round, user_id: userId }
    const holePayload = holes.map((hole) => ({ ...hole, user_id: userId }))
    const { error: roundError } = await supabase.from('rounds').upsert(roundPayload)
    if (roundError) throw roundError
    const { error: holesError } = await supabase.from('hole_results').upsert(holePayload)
    if (holesError) throw holesError
    return 'saved'
  } catch {
    return 'error'
  }
}

export async function loadRoundBundle(roundId: string): Promise<{ round: Round | null; holes: HoleResult[] }> {
  const rounds = await loadRounds()
  const round = rounds.find((item) => item.id === roundId)
  let holes = (await loadLocalHoleResults(roundId)).map(normalizeHole)

  if ((!holes.length || holes.every((hole) => hole.score == null)) && isCloudConfigured && navigator.onLine && supabase) {
    try {
      await ensureAnonymousSession()
      const { data, error } = await supabase.from('hole_results').select('*').eq('round_id', roundId).order('hole_number')
      if (error) throw error
      if (data?.length) {
        holes = (data as HoleResult[]).map(normalizeHole)
        await saveLocalHoleResults(roundId, holes)
      }
    } catch {
      // Keep the locally available bundle when the cloud is unavailable.
    }
  }

  return { round: round ? normalizeRound(round) : null, holes }
}

export async function deleteRound(roundId: string): Promise<SyncState> {
  await deleteLocalRound(roundId)
  if (!isCloudConfigured || !supabase) return 'local-only'
  if (!navigator.onLine) {
    await queuePendingRoundDelete(roundId)
    return 'offline'
  }
  try {
    await ensureAnonymousSession()
    const { error } = await supabase.from('rounds').delete().eq('id', roundId)
    if (error) throw error
    await clearPendingRoundDelete(roundId)
    return 'saved'
  } catch {
    await queuePendingRoundDelete(roundId)
    return 'error'
  }
}

export async function listRounds(): Promise<Round[]> {
  return (await loadRounds()).map(normalizeRound)
}
