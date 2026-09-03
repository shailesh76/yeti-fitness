import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function getSupabaseUrl(): string {
  const url = Deno.env.get('SUPABASE_URL')
  if (!url) {
    throw new Error('SUPABASE_URL is not configured')
  }
  return url
}

export function getServiceRoleKey(): string {
  const key =
    Deno.env.get('SB_SECRET_KEY') ??
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!key) {
    throw new Error('Supabase privileged service-role key is not configured (missing SB_SECRET_KEY and SUPABASE_SERVICE_ROLE_KEY)')
  }
  return key
}

export function getPublishableOrAnonKey(): string {
  const key =
    Deno.env.get('SB_PUBLISHABLE_KEY') ??
    Deno.env.get('SUPABASE_ANON_KEY')
  if (!key) {
    throw new Error('Supabase client key is not configured (missing SB_PUBLISHABLE_KEY and SUPABASE_ANON_KEY)')
  }
  return key
}

export function createServiceRoleClient(options?: { auth?: { persistSession?: boolean; autoRefreshToken?: boolean } }): SupabaseClient {
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false, ...options?.auth }
  })
}

export function createAnonClient(authHeader?: string): SupabaseClient {
  const options = authHeader
    ? { global: { headers: { Authorization: authHeader } } }
    : undefined
  return createClient(getSupabaseUrl(), getPublishableOrAnonKey(), options)
}
