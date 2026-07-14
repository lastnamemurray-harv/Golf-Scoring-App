import seedData from '../data/seedCourses.json'
import type { Course, CourseHole, HoleResult, ImportedCourseDraft, MetricConfig, Round, SyncState } from '../types'
import { ensureAnonymousSession, isCloudConfigured, supabase } from './supabase'
import {
  getActiveRoundId, loadCourseHoles, loadCourses, loadLocalHoleResults, loadRounds, loadSettings,
  saveCourseHoles, saveCourses, saveLocalHoleResults, saveSettings, setActiveRoundId, upsertLocalRound,
} from './localDb'

export interface AppData {
  courses: Course[]
  courseHoles: CourseHole[]
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

export async function initializeAppData(): Promise<AppData> {
  let courses = await loadCourses()
  let courseHoles = await loadCourseHoles()
  if (!courses.length) {
    courses = seedData.courses as Course[]
    courseHoles = seedData.course_holes as CourseHole[]
    await saveCourses(courses)
    await saveCourseHoles(courseHoles)
  }

  let cloudUserId: string | null = null
  let cloudError: string | null = null
  if (isCloudConfigured && navigator.onLine && supabase) {
    try {
      cloudUserId = await ensureAnonymousSession()
      const [{ data: cloudCourses, error: courseError }, { data: cloudHoles, error: holeError }, { data: cloudRounds, error: roundsError }] = await Promise.all([
        supabase.from('courses').select('*'),
        supabase.from('course_holes').select('*'),
        supabase.from('rounds').select('*').order('started_at', { ascending: false }),
      ])
      if (courseError) throw courseError
      if (holeError) throw holeError
      if (roundsError) throw roundsError
      courses = mergeById(courses, (cloudCourses ?? []) as Course[])
      courseHoles = mergeById(courseHoles, (cloudHoles ?? []) as CourseHole[])
      await saveCourses(courses)
      await saveCourseHoles(courseHoles)
      if (cloudRounds?.length) {
        for (const round of cloudRounds as Round[]) await upsertLocalRound(round)
      }
      const { data: cloudSettings } = await supabase.from('user_settings').select('metric_config').maybeSingle()
      if (cloudSettings?.metric_config) await saveSettings(cloudSettings.metric_config as MetricConfig)
    } catch (error) {
      cloudError = error instanceof Error ? error.message : 'Cloud sync unavailable.'
    }
  }

  return {
    courses,
    courseHoles,
    rounds: await loadRounds(),
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

export async function saveImportedCourse(draft: ImportedCourseDraft): Promise<{ course: Course; holes: CourseHole[]; sync: SyncState }> {
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
    rating: null,
    slope: null,
    data_coverage: 'User-imported scorecard',
    source_url: '',
    notes: 'Extracted from a photographed scorecard and confirmed by the user.',
    is_public: false,
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
  const localHoles = await loadCourseHoles()
  await saveCourses([course, ...localCourses.filter((c) => c.course_key !== courseKey)])
  await saveCourseHoles([...holes, ...localHoles.filter((h) => h.course_key !== courseKey)])

  if (!isCloudConfigured || !supabase) return { course, holes, sync: 'local-only' }
  if (!navigator.onLine) return { course, holes, sync: 'offline' }
  try {
    const userId = await ensureAnonymousSession()
    if (!userId) return { course, holes, sync: 'local-only' }
    const { data: existing } = await supabase
      .from('courses')
      .select('id')
      .eq('course_key', courseKey)
      .eq('owner_id', userId)
      .maybeSingle()
    if (existing?.id) {
      course.id = existing.id as string
      holes.forEach((hole) => { hole.course_id = course.id })
    }
    course.owner_id = userId
    const { error: courseError } = await supabase.from('courses').upsert(course)
    if (courseError) throw courseError
    await supabase.from('course_holes').delete().eq('course_id', course.id).eq('tee_name', draft.tee_name)
    const cloudHoles = holes.map((hole) => ({ ...hole, owner_id: userId }))
    const { error: holeError } = await supabase.from('course_holes').insert(cloudHoles)
    if (holeError) throw holeError
    const refreshedCourses = await loadCourses()
    const refreshedHoles = await loadCourseHoles()
    await saveCourses([course, ...refreshedCourses.filter((item) => item.course_key !== courseKey)])
    await saveCourseHoles([...holes, ...refreshedHoles.filter((item) => item.course_key !== courseKey)])
    return { course, holes, sync: 'saved' }
  } catch {
    return { course, holes, sync: 'error' }
  }
}

export async function saveRoundAndHoles(round: Round, holes: HoleResult[]): Promise<SyncState> {
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
  return { round: rounds.find((r) => r.id === roundId) ?? null, holes: await loadLocalHoleResults(roundId) }
}

export async function listRounds(): Promise<Round[]> { return loadRounds() }
