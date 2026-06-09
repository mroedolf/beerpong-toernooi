// Supabase-backed sharing for tournaments. A tournament has a public read id
// (shared in the link) and a secret owner_token kept only by the creator. Reads
// are open; writes go through an RPC that checks the owner token server-side, so
// viewers can never change scores even by tampering with the client.

import { SUPABASE_URL, SUPABASE_ANON_KEY, isCloudConfigured } from './cloudConfig.js'

export class CloudError extends Error {}

function headers() {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  }
}

function ensureConfigured() {
  if (!isCloudConfigured()) throw new CloudError('Delen is nog niet ingesteld in deze app.')
}

async function request(url, options) {
  let res
  try {
    res = await fetch(url, options)
  } catch {
    throw new CloudError('Geen verbinding met de database. Check je internet.')
  }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new CloudError('De database weigert de toegang (controleer de config).')
    throw new CloudError(`Database-fout (HTTP ${res.status}).`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

function rpc(name, body) {
  ensureConfigured()
  return request(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
}

// Create a shared tournament; returns its public id and the secret owner token.
export async function createTournament(data) {
  const rows = await rpc('create_tournament', { p_data: data })
  const row = Array.isArray(rows) ? rows[0] : rows
  if (!row?.id || !row?.owner_token) throw new CloudError('Aanmaken mislukt — onverwacht antwoord.')
  return { id: row.id, ownerToken: row.owner_token }
}

// Overwrite a tournament — only succeeds when the owner token matches.
export async function updateTournament(id, ownerToken, data) {
  const ok = await rpc('update_tournament', { p_id: id, p_token: ownerToken, p_data: data })
  if (ok !== true) throw new CloudError('Alleen de maker kan dit toernooi aanpassen.')
  return true
}

// Read the latest shared state by id.
export async function fetchTournament(id) {
  ensureConfigured()
  const rows = await request(
    `${SUPABASE_URL}/rest/v1/tournaments?id=eq.${encodeURIComponent(id)}&select=data,updated_at`,
    { headers: headers() },
  )
  if (!rows?.length) throw new CloudError('Dit gedeelde toernooi bestaat niet (meer).')
  return { data: rows[0].data, updatedAt: rows[0].updated_at }
}
