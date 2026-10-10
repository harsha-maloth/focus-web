import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Stats } from '../../lib/types'

/** Awards any milestones now due, then reads the numbers. All of it is computed in Postgres. */
export function useStats(userId: string) {
  return useQuery({
    queryKey: ['stats', userId],
    queryFn: async (): Promise<Stats> => {
      // A failed award must not hide the stats themselves.
      await supabase.rpc('award_milestones')
      const { data, error } = await supabase.rpc('my_stats')
      if (error) throw new Error(error.message)
      return data as Stats
    },
  })
}
