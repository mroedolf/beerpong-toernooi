// Synthesized sound effects via the Web Audio API — no asset files, works
// offline. Vue-free; the AudioContext is created lazily on the first play so it
// unlocks inside the tap gesture that triggers a roll.

const STORAGE_KEY = 'beerpong:sound:v1'

let ctx = null
let muted = loadMuted()

function loadMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'off'
  } catch {
    return false
  }
}

export function isMuted() {
  return muted
}

export function setMuted(value) {
  muted = !!value
  try {
    localStorage.setItem(STORAGE_KEY, muted ? 'off' : 'on')
  } catch {
    // Private mode / quota — keep the in-memory preference.
  }
}

export function toggleMuted() {
  setMuted(!muted)
  return muted
}

function audio() {
  if (muted) return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// One enveloped oscillator note — quick attack, exponential decay.
function note(ac, { freq, start, dur, type = 'square', gain = 0.18 }) {
  const osc = ac.createOscillator()
  const env = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  env.gain.setValueAtTime(0.0001, start)
  env.gain.linearRampToValueAtTime(gain, start + 0.01)
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(env).connect(ac.destination)
  osc.start(start)
  osc.stop(start + dur)
}

// MEX — triumphant ascending arpeggio (C5 E5 G5 C6) with a ringing top note.
export function playMex() {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime
  const arpeggio = [523.25, 659.25, 783.99, 1046.5]
  arpeggio.forEach((freq, i) => note(ac, { freq, start: t + i * 0.09, dur: 0.2, gain: 0.2 }))
  note(ac, { freq: 1567.98, start: t + arpeggio.length * 0.09, dur: 0.55, type: 'triangle', gain: 0.16 })
}

// Dubbel — a short, bright two-note chime.
export function playDouble() {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime
  note(ac, { freq: 659.25, start: t, dur: 0.14, gain: 0.17 })
  note(ac, { freq: 987.77, start: t + 0.1, dur: 0.24, gain: 0.17 })
}

// 31 — a quirky downward "boing": the throw bounces back to you.
export function playReturn31() {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime
  const osc = ac.createOscillator()
  const env = ac.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(440, t)
  osc.frequency.exponentialRampToValueAtTime(150, t + 0.28)
  env.gain.setValueAtTime(0.0001, t)
  env.gain.linearRampToValueAtTime(0.16, t + 0.02)
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
  osc.connect(env).connect(ac.destination)
  osc.start(t)
  osc.stop(t + 0.32)
}
