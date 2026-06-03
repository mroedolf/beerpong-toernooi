// Browser image helpers: read files and downscale to keep localStorage small.

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Kon de foto niet lezen'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Kon de foto niet laden'))
    img.src = src
  })
}

// Re-encode as JPEG capped at maxDim on the longest side.
export async function downscale(dataUrl, maxDim, quality = 0.85) {
  const img = await loadImage(dataUrl)
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff' // JPEG has no alpha; avoid black backgrounds for PNGs
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

export const PLAYER_PHOTO_MAX = 512
export const AI_PHOTO_MAX = 768
