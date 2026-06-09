// Browser-direct client for the Gemini Interactions API (image generation).

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions'
const MODEL = 'gemini-3.1-flash-image'

export class GeminiError extends Error {}

export function splitDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl)
  if (!match) throw new GeminiError('Ongeldige afbeelding')
  return { mimeType: match[1], data: match[2] }
}

export function extractImage(interaction) {
  let found = null
  for (const step of interaction.steps ?? []) {
    if (step.type !== 'model_output') continue
    for (const block of step.content ?? []) {
      if (block.type === 'image' && block.data) found = block
    }
  }
  if (!found && interaction.output_image?.data) found = interaction.output_image
  return found
}

function friendlyError(status) {
  if (status === 401 || status === 403) {
    return 'De Gemini API key lijkt ongeldig. Controleer hem op het setup-scherm.'
  }
  if (status === 429) {
    return 'Quota bereikt bij Google — wacht een minuutje en probeer opnieuw.'
  }
  return `De AI-fotogenerator gaf een fout (HTTP ${status}). Probeer opnieuw.`
}

export async function generateTeamPhoto({ apiKey, prompt, photos }) {
  const input = [
    { type: 'text', text: prompt },
    ...photos.map(p => {
      const { mimeType, data } = splitDataUrl(p)
      return { type: 'image', mime_type: mimeType, data }
    }),
  ]
  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      // Only CORS-safe headers: a custom header like `Api-Revision` makes the
      // browser preflight ask for it, which Google rejects (403) — the fetch
      // then throws and looks like "no connection". The API uses its default
      // revision without it.
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model: MODEL,
        input,
        response_format: { type: 'image', aspect_ratio: '4:3', image_size: '1K' },
      }),
    })
  } catch {
    throw new GeminiError('Geen verbinding met de AI-fotogenerator. Check je internet.')
  }
  if (!res.ok) throw new GeminiError(friendlyError(res.status))
  const interaction = await res.json()
  const image = extractImage(interaction)
  if (!image) throw new GeminiError('De AI gaf geen afbeelding terug — probeer het nog eens.')
  return `data:${image.mime_type || 'image/png'};base64,${image.data}`
}
