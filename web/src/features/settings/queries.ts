import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Profile, UserSettings } from '../../lib/types'

export function useProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (error) throw new Error(error.message)
      return data as Profile
    },
  })
}

export function useSettings(userId: string) {
  return useQuery({
    queryKey: ['settings', userId],
    queryFn: async (): Promise<UserSettings> => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()
      if (error) throw new Error(error.message)
      return data as UserSettings
    },
  })
}

export type ProfileChanges = Pick<Profile, 'display_name' | 'timezone'> &
  Partial<Pick<Profile, 'timezone_confirmed'>>
export type SettingsChanges = Pick<UserSettings, 'default_minutes' | 'break_minutes'>

export function useSaveProfile(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (changes: ProfileChanges) => {
      const { error } = await supabase.from('profiles').update(changes).eq('id', userId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
  })
}

export function useSaveSettings(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (changes: SettingsChanges) => {
      const { error } = await supabase.from('user_settings').update(changes).eq('user_id', userId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', userId] }),
  })
}

export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) throw new Error(error.message)
  // The user no longer exists server-side; clear the local session only.
  await supabase.auth.signOut({ scope: 'local' })
}
