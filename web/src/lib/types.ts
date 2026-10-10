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
