// apps/web/src/lib/supabase-server.ts
//
// Server-only Supabase client using the service role key.
// NEVER import this file in client components — it exposes the service role key.
//
// Note: Using untyped client intentionally — the license_keys table is bootstrapped
// manually and does not yet have Supabase-generated type definitions.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface LicenseKey {
  id:          string
  key:         string
  order_id:    string | null
  email:       string | null
  claimed_at:  string | null
  created_at:  string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: SupabaseClient<any> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseServerClient(): SupabaseClient<any> {
  if (_client) return _client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  _client = createClient(url, key)
  return _client
}
