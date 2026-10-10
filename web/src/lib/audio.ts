// Sounds are generated in the browser with the Web Audio API: no audio files, so nothing to
// license and nothing to download.

export const SOUND_OPTIONS = ['none', 'chime', 'bell'] as const
export type EndSound = (typeof SOUND_OPTIONS)[number]

export const AMBIENT_OPTIONS = ['off', 'brown', 'white'] as const
export type Ambient = (typeof AMBIENT_OPTIONS)[number]

export const SOUND_LABELS: Record<EndSound, string> = { none: 'Silent', chime: 'Chime', bell: 'Bell' }
export const AMBIENT_LABELS: Record<Ambient, string> = {
  off: 'Off',
  brown: 'Brown noise (deep, soft)',
  white: 'White noise (hiss)',
}

/** The stored value is free text (the column only limits its length), so anything unknown means silent. */
export function normalizeSound(value: unknown): EndSound {
  return SOUND_OPTIONS.find((s) => s === value) ?? 'none'
}

/** Ambient choice lives in the `zen` settings object: { ambient: 'brown' }. */
export function readAmbient(zen: unknown): Ambient {
  const value = typeof zen === 'object' && zen !== null ? (zen as { ambient?: unknown }).ambient : undefined
  return AMBIENT_OPTIONS.find((a) => a === value) ?? 'off'
}

let context: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!context) context = new Ctor()
  return context
}

/** Browsers only allow audio after a tap. Call this from a click handler (Start, Test sound). */
export function unlockAudio(): void {
  const c = getContext()
  if (c && c.state === 'suspended') {
    c.resume().catch(() => {
      // Still blocked: the end sound just won't play.
    })
  }
}

function tone(c: AudioContext, freq: number, start: number, length: number, peak: number) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
  osc.connect(gain).connect(c.destination)
  osc.start(start)
  osc.stop(start + length + 0.05)
}

/** Plays the end-of-session sound. Silent if the choice is "none" or audio is unavailable. */
export function playEndSound(kind: EndSound): void {
  if (kind === 'none') return
  const c = getContext()
  if (!c) return
  unlockAudio()
  const t = c.currentTime + 0.02
  if (kind === 'chime') {
    tone(c, 880, t, 1.2, 0.25)
    tone(c, 1318.5, t + 0.18, 1.6, 0.22)
  } else {
    tone(c, 523.25, t, 2.5, 0.3)
    tone(c, 1046.5, t, 1.8, 0.12)
    tone(c, 1568, t, 1.2, 0.06)
  }
}

function noiseBuffer(c: AudioContext, kind: Exclude<Ambient, 'off'>): AudioBuffer {
  const length = c.sampleRate * 4
  const buffer = c.createBuffer(1, length, c.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    if (kind === 'white') {
      data[i] = white
    } else {
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
  }
  return buffer
}

/** Starts a looping ambient noise. Returns a function that fades it out and stops it. */
export function startAmbient(kind: Ambient): () => void {
  if (kind === 'off') return () => {}
  const c = getContext()
  if (!c) return () => {}
  unlockAudio()
  const source = c.createBufferSource()
  source.buffer = noiseBuffer(c, kind)
  source.loop = true
  const gain = c.createGain()
  const level = kind === 'white' ? 0.06 : 0.35
  gain.gain.setValueAtTime(0.0001, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(level, c.currentTime + 1.5)
  source.connect(gain).connect(c.destination)
  source.start()
  return () => {
    const now = c.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)
    source.stop(now + 0.5)
  }
}
