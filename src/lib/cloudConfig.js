// Free Supabase project that backs tournament sharing. Both values are safe to
// commit: the anon key is public by design and protected by row-level security
// plus the owner-token check in the update RPC (see supabase/schema.sql). Paste
// your project's values here to enable sharing; leave empty to keep it off.
export const SUPABASE_URL = 'https://ivttwgzynkqxipfrdcdu.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_qNPak99sDPH6h9K1Mliyxg_k9c3d0y2'

export const isCloudConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
