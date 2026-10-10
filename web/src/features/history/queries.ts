import { useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { FocusSession } from '../../lib/types'

export const HISTORY_PAGE = 20

export type HistoryFilter = {
  /** '' = all tags, 'none' = sessions without a tag, otherwise a tag id. */
  tag: string
  status: 'all' | 'completed' | 'abandoned'
}

/** Finished sessions, newest first, loaded 20 at a time. Row level security limits it to the caller's own. */
export function useHistory(userId: string, filter: HistoryFilter) {
  return useInfiniteQuery({
    queryKey: ['history', userId, filter.tag, filter.status],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<FocusSession[]> => {
      let query = supabase.from('focus_sessions').select('*').neq('status', 'running')
      if (filter.status !== 'all') query = query.eq('status', filter.status)
      if (filter.tag === 'none') query = query.is('tag_id', null)
      else if (filter.tag) query = query.eq('tag_id', filter.tag)
      const { data, error } = await query
        .order('started_at', { ascending: false })
        .range(pageParam, pageParam + HISTORY_PAGE - 1)
      if (error) throw new Error(error.message)
      return (data ?? []) as FocusSession[]
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === HISTORY_PAGE ? allPages.length * HISTORY_PAGE : undefined,
  })
}
