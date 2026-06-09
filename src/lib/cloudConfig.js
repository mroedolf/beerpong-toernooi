// Free Supabase project that backs tournament sharing. Both values are safe to
// commit: the anon key is public by design and protected by row-level security
// plus the owner-token check in the update RPC (see supabase/schema.sql). Paste
// your project's values here to enable sharing; leave empty to keep it off.
export const SUPABASE_URL = ''
export const SUPABASE_ANON_KEY = ''

export const isCloudConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
