export type Screen = 'home' | 'setup' | 'round' | 'scorecard' | 'history' | 'import' | 'settings'
export type SyncState = 'local-only' | 'saved' | 'saving' | 'offline' | 'error'

export const PRIMARY_PLAYER_ID = 'primary'

export interface Player {
  id: string
  name: string
  is_primary: boolean
}

export const DEFAULT_PLAYERS: Player[] = [
  { id: PRIMARY_PLAYER_ID, name: 'You', is_primary: true },
]

export interface Course {
  id: string
  course_key: string
  owner_id?: string | null
  name: string
  layout: string
  city: string
  address: string
  access: string
  hole_count: number
  default_tee: string
  course_par: number | null
  total_yardage: number | null
  rating: number | null
  slope: number | null
  data_coverage: string
  source_url: string
  notes: string
  is_public: boolean
}

export interface CourseHole {
  id: string
  course_id: string
  course_key: string
  tee_name: string
  hole_number: number
  par: number | null
  yardage: number | null
  handicap: number | null
  source_url?: string
}

export interface MetricConfig {
  courseDetails: boolean
  scoringZone: boolean
  teeClub: boolean
  teeResult: boolean
  gir: boolean
  putting: boolean
  inside4ft: boolean
  madePuttLength: boolean
  penalties: boolean
  shortGame: boolean
  methodScore: boolean
  notes: boolean
}

export const DEFAULT_METRICS: MetricConfig = {
  courseDetails: true,
  scoringZone: true,
  teeClub: true,
  teeResult: true,
  gir: true,
  putting: true,
  inside4ft: true,
  madePuttLength: true,
  penalties: true,
  shortGame: true,
  methodScore: true,
  notes: true,
}

export interface Round {
  id: string
  user_id?: string
  course_id?: string | null
  course_key: string
  course_name: string
  layout: string
  tee_name: string
  date: string
  started_at: string
  completed_at?: string | null
  status: 'in_progress' | 'complete'
  playing_handicap: number | null
  target_score: number | null
  primary_focus: string
  tracking_config: MetricConfig
  players: Player[]
  total_score?: number | null
  to_par?: number | null
  method_pct?: number | null
  scoring_zone_pct?: number | null
  notes?: string
}

export interface HoleResult {
  id: string
  round_id: string
  user_id?: string
  hole_number: number
  par: number | null
  yardage: number | null
  hole_handicap: number | null
  entering_zone_target: number | null
  entering_zone_actual: number | null
  entering_zone_point: number | null
  down_zone_target: number
  down_zone_actual: number | null
  down_zone_point: number | null
  score: number | null
  player_scores: Record<string, number | null>
  putts: number | null
  inside_4ft_result: 'Made' | 'Missed' | 'N/A' | ''
  made_putt_length_ft: number | null
  penalty_strokes: number
  tee_result: string
  club_used_off_tee: string
  gir: 'Yes' | 'No' | 'N/A' | ''
  chips_pitches: number | null
  up_down: 'Yes' | 'No' | 'N/A' | ''
  plan: 0 | 1 | null
  routine: 0 | 1 | null
  commit: 0 | 1 | null
  smart_decision: 0 | 1 | null
  reset: 0 | 1 | null
  notes: string
  updated_at: string
}

export interface ImportedCourseDraft {
  name: string
  layout: string
  city: string
  address: string
  tee_name: string
  source_text: string
  holes: Array<{
    hole_number: number
    par: number | null
    yardage: number | null
    handicap: number | null
  }>
}
