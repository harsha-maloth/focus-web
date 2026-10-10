import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { FocusSession, SessionStatus } from '../../lib/types'

/** The user's running session, or null. At most one can exist (unique index). */
export function useRunningSession(userId: string) {
  return useQuery({
    queryKey: ['running-session', userId],
    staleTime: 0,
    queryFn: async (): Promise<FocusSession | null> => {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('status', 'running')
        .maybeSingle()
      if (error) throw new Error(error.message)
      return (data as FocusSession | null) ?? null
    },
  })
}

export function useRecentSessions(userId: string) {
  return useQuery({
    queryKey: ['recent-sessions', userId],
    queryFn: async (): Promise<FocusSession[]> => {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .neq('status', 'running')
        .order('started_at', { ascending: false })
        .limit(8)
      if (error) throw new Error(error.message)
      return (data ?? []) as FocusSession[]
    },
  })
}

/**
 * Milliseconds to add to Date.now() to get server time. The timer counts down
 * against server time so a wrong device clock cannot change how long a session
 * lasts. Measured once, using the midpoint of the round trip.
 */
export function useServerOffset() {
  return useQuery({
    queryKey: ['server-offset'],
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
    queryFn: async (): Promise<number> => {
      const sent = Date.now()
      const { data, error } = await supabase.rpc('server_time')
      const received = Date.now()
      if (error) throw new Error(error.message)
      return new Date(data as string).getTime() - (sent + received) / 2
    },
  })
}

export async function rpcStartSession(
  plannedSeconds: number,
  tagId: string | null,
): Promise<FocusSession> {
  const { data, error } = await supabase.rpc('start_session', {
    p_tag_id: tagId,
    p_planned_seconds: plannedSeconds,
  })
  if (error) throw new Error(error.message)
  return data as FocusSession
}

export async function rpcEndSession(
  sessionId: string,
  status: Exclude<SessionStatus, 'running'>,
): Promise<FocusSession> {
  const { data, error } = await supabase.rpc('end_session', {
    p_session_id: sessionId,
    p_status: status,
  })
  if (error) throw new Error(error.message)
  return data as FocusSession
}

export async function rpcLogEvent(sessionId: string, type: 'blur' | 'focus'): Promise<void> {
  const { error } = await supabase.rpc('log_session_event', {
    p_session_id: sessionId,
    p_type: type,
  })
  if (error) throw new Error(error.message)
}

/** Tells the server the page is open. Lets it count the time toward a completed session. */
export async function rpcHeartbeat(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('session_heartbeat', { p_session_id: sessionId })
  if (error) throw new Error(error.message)
}

/** Awards milestones the new session may have earned. Failure is harmless: Stats retries. */
export async function rpcAwardMilestones(): Promise<void> {
  await supabase.rpc('award_milestones')
}
