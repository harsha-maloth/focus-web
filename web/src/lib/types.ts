export type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
  timezone: string
  timezone_confirmed: boolean
  created_at: string
}

export type UserSettings = {
  user_id: string
  default_minutes: number
  break_minutes: number
  sound: string
  zen: Record<string, unknown>
  updated_at: string
}

export type SessionStatus = 'running' | 'completed' | 'abandoned'

export type FocusSession = {
  id: string
  user_id: string
  tag_id: string | null
  started_at: string
  planned_seconds: number
  ended_at: string | null
  status: SessionStatus
  focused_seconds: number
  distraction_count: number
  source: 'web' | 'android' | 'extension'
  created_at: string
}

export type Tag = {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export type Stats = {
  timezone: string
  today: string
  today_seconds: number
  week_seconds: number
  last_week_seconds: number
  month_seconds: number
  total_seconds: number
  total_sessions: number
  completed_sessions: number
  current_streak: number
  longest_streak: number
  active_today: boolean
  daily: { day: string; seconds: number }[]
  tags: { tag_id: string | null; name: string | null; color: string | null; seconds: number }[]
  milestones: { type: string; value: number; achieved_at: string }[]
}
