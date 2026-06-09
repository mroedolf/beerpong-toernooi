import { describe, it, expect, vi, afterEach } from 'vitest'
import { generateTeamPhoto, verifyApiKey, extractImage, splitDataUrl, GeminiError } from './gemini.js'

afterEach(() => vi.unstubAllGlobals())

describe('verifyApiKey', () => {
  it('resolves true when the models call succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await expect(verifyApiKey('good')).resolves.toBe(true)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('/v1beta/models')
    expect(opts.headers['x-goog-api-key']).toBe('good')
  })
  it('rejects an empty key without calling the network', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(verifyApiKey('  ')).rejects.toThrow(/API key/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('maps 4xx to an invalid-key message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }))
    await expect(verifyApiKey('bad')).rejects.toThrow(/ongeldig/)
  })
  it('maps a thrown fetch to a connection message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    await expect(verifyApiKey('x')).rejects.toThrow(/verbinding/)
  })
})

describe('splitDataUrl', () => {
  it('splits mime and base64 payload', () => {
    expect(splitDataUrl('data:image/jpeg;base64,AAAA')).toEqual({ mimeType: 'image/jpeg', data: 'AAAA' })
  })
  it('throws on non-data URLs', () => {
    expect(() => splitDataUrl('https://example.com/x.png')).toThrow()
  })
})

describe('extractImage', () => {
  it('finds the last image block in model_output steps', () => {
    const interaction = {
      steps: [
        { type: 'model_output', status: 'done', content: [
          { type: 'text', text: 'here you go' },
          { type: 'image', mime_type: 'image/png', data: 'FIRST' },
          { type: 'image', mime_type: 'image/png', data: 'LAST' },
        ] },
      ],
    }
    expect(extractImage(interaction)).toMatchObject({ data: 'LAST' })
  })
  it('falls back to output_image', () => {
    expect(extractImage({ output_image: { mime_type: 'image/png', data: 'X' } })).toMatchObject({ data: 'X' })
  })
  it('returns null when there is no image', () => {
    expect(extractImage({ steps: [{ type: 'model_output', content: [{ type: 'text', text: 'nope' }] }] })).toBeNull()
  })
})

describe('generateTeamPhoto', () => {
  const photos = ['data:image/jpeg;base64,AAA', 'data:image/jpeg;base64,BBB']

  it('POSTs prompt + both photos and returns a data URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ steps: [{ type: 'model_output', content: [{ type: 'image', mime_type: 'image/png', data: 'OUT' }] }] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await generateTeamPhoto({ apiKey: 'k', prompt: 'funny pic', photos })
    expect(result).toBe('data:image/png;base64,OUT')
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('/v1beta/interactions')
    expect(opts.headers['x-goog-api-key']).toBe('k')
    const body = JSON.parse(opts.body)
    expect(body.model).toBe('gemini-3.1-flash-image')
    expect(body.input.filter(b => b.type === 'image')).toHaveLength(2)
    expect(body.input.find(b => b.type === 'text').text).toBe('funny pic')
  })

  it('maps 4xx auth errors to a friendly Dutch message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }))
    await expect(generateTeamPhoto({ apiKey: 'bad', prompt: 'x', photos })).rejects.toThrow(/API key/)
  })

  it('maps 429 to a quota message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }))
    await expect(generateTeamPhoto({ apiKey: 'k', prompt: 'x', photos })).rejects.toThrow(/[Qq]uota/)
  })

  it('throws when the response has no image', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ steps: [] }) }))
    await expect(generateTeamPhoto({ apiKey: 'k', prompt: 'x', photos })).rejects.toThrow(GeminiError)
  })
})
