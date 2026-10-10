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
