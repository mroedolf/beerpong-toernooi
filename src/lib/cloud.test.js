import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('./cloudConfig.js', () => ({
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  isCloudConfigured: () => true,
}))

import { createTournament, updateTournament, fetchTournament, CloudError } from './cloud.js'

const okJson = body => ({ ok: true, status: 200, text: async () => JSON.stringify(body) })

afterEach(() => vi.unstubAllGlobals())

describe('createTournament', () => {
  it('returns the id and owner token from the RPC', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson([{ id: 'abc', owner_token: 'secret' }]))
    vi.stubGlobal('fetch', fetchMock)
    await expect(createTournament({ phase: 'active' })).resolves.toEqual({ id: 'abc', ownerToken: 'secret' })
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('/rest/v1/rpc/create_tournament')
    expect(opts.headers.apikey).toBe('anon-key')
    expect(JSON.parse(opts.body)).toEqual({ p_data: { phase: 'active' } })
  })
})

describe('updateTournament', () => {
  it('resolves when the RPC returns true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson(true)))
    await expect(updateTournament('abc', 'secret', {})).resolves.toBe(true)
  })
  it('rejects (owner only) when the RPC returns false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson(false)))
    await expect(updateTournament('abc', 'wrong', {})).rejects.toThrow(/maker/)
  })
})

describe('fetchTournament', () => {
  it('returns the stored data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson([{ data: { phase: 'done' }, updated_at: 't' }])))
    await expect(fetchTournament('abc')).resolves.toEqual({ data: { phase: 'done' }, updatedAt: 't' })
  })
  it('rejects when the tournament is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson([])))
    await expect(fetchTournament('nope')).rejects.toThrow(/bestaat niet/)
  })
})

describe('error mapping', () => {
  it('maps a thrown fetch to a connection error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')))
    await expect(fetchTournament('abc')).rejects.toThrow(CloudError)
    await expect(fetchTournament('abc')).rejects.toThrow(/verbinding/)
  })
  it('maps 403 to an access error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => '' }))
    await expect(fetchTournament('abc')).rejects.toThrow(/toegang/)
  })
})
