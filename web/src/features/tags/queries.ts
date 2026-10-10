import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Tag } from '../../lib/types'

export function useTags(userId: string) {
  return useQuery({
    queryKey: ['tags', userId],
    queryFn: async (): Promise<Tag[]> => {
      const { data, error } = await supabase.from('tags').select('*').order('name')
      if (error) throw new Error(error.message)
      return (data ?? []) as Tag[]
    },
  })
}

/** Turn database errors into something a person can act on. */
export function tagErrorMessage(message: string): string {
  if (/duplicate|unique/i.test(message)) return 'You already have a tag with that name.'
  if (/tag limit/i.test(message)) return 'You can have up to 50 tags.'
  return message
}

export type TagFields = { name: string; color: string }

export function useCreateTag(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (fields: TagFields) => {
      const { error } = await supabase.from('tags').insert({ user_id: userId, ...fields })
      if (error) throw new Error(tagErrorMessage(error.message))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags', userId] }),
  })
}

export function useUpdateTag(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: TagFields & { id: string }) => {
      const { id, ...fields } = input
      const { error } = await supabase.from('tags').update(fields).eq('id', id)
      if (error) throw new Error(tagErrorMessage(error.message))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags', userId] }),
  })
}

/** Sessions keep their time; their tag becomes empty (on delete set null). */
export function useDeleteTag(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tags', userId] })
      void queryClient.invalidateQueries({ queryKey: ['recent-sessions', userId] })
      void queryClient.invalidateQueries({ queryKey: ['running-session', userId] })
    },
  })
}
