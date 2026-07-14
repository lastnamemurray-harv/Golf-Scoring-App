import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const isCloudConfigured = Boolean(url && publishableKey)
export const supabase: SupabaseClient | null = isCloudConfigured
  ? createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

export async function ensureAnonymousSession(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  if (data.session?.user.id) return data.session.user.id

  const { data: signInData, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return signInData.user?.id ?? null
}
