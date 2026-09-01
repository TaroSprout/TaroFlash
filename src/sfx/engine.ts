/**
 * Web Audio engine for one-shot sound effects.
 *
 * Owns the context outright so it can be closed and rebuilt on demand — the
 * only cure for an interrupted one. →[K:ios-audio-interruption] Decoded buffers
 * aren't bound to a context, so a rebuild costs no reloading.
 */

type AudioContextCtor = new () => AudioContext

const RESUME_TIMEOUT_MS = 2000

let ctx: AudioContext | undefined
let unlocked = false

const state_listeners = new Set<() => void>()
const unlock_listeners = new Set<() => void>()

function resolveCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const win = window as unknown as {
    AudioContext?: AudioContextCtor
    webkitAudioContext?: AudioContextCtor
  }
  return win.AudioContext ?? win.webkitAudioContext
}

// Clearing the latch on every non-running state is what lets a later recovery
// re-fire the unlock listeners and drain whatever queued up meanwhile.
function notifyState(): void {
  if (ctx?.state === 'running') {
    markUnlocked()
  } else {
    unlocked = false
  }
  state_listeners.forEach((cb) => cb())
}

// Call from both paths that can reach 'running': the statechange event, and
// unlock()'s synchronous check for a fresh context born running.
function markUnlocked(): void {
  if (unlocked) return
  unlocked = true
  unlock_listeners.forEach((cb) => cb())
}

/**
 * Plays one silent sample to actually open audio output.
 *
 * Resuming alone leaves iOS muted — output opens only when a source starts
 * inside the gesture. →[K:ios-audio-interruption] Keep it synchronous, and keep
 * the try/catch: an unguarded version once rejected the resume and killed audio
 * on every platform.
 */
function primeOutput(context: AudioContext): void {
  try {
    const source = context.createBufferSource()
    source.buffer = context.createBuffer(1, 1, 22050)
    source.connect(context.destination)
    source.start(0)
  } catch {
    // Ignore — priming is an optimisation, not a requirement.
  }
}

function createContext(): AudioContext | undefined {
  const Ctor = resolveCtor()
  if (!Ctor) return undefined
  ctx = new Ctor()
  ctx.addEventListener('statechange', notifyState)
  return ctx
}

function ensureContext(): AudioContext | undefined {
  return ctx ?? createContext()
}

async function decode(url: string): Promise<AudioBuffer> {
  const context = ensureContext()
  if (!context) throw new Error('Web Audio is unavailable')

  const response = await fetch(url)
  const data = await response.arrayBuffer()
  return context.decodeAudioData(data)
}

/**
 * Plays a decoded buffer once, resolving when it finishes.
 *
 * The fallback timer is load-bearing: a context that suspends mid-play never
 * fires `onended`, so without it the promise would hang.
 */
async function play(buffer: AudioBuffer, volume: number): Promise<void> {
  const running = await resume()
  if (!running) return

  const context = ctx
  if (!context) return

  const source = context.createBufferSource()
  source.buffer = buffer
  const gain = context.createGain()
  gain.gain.value = volume
  source.connect(gain).connect(context.destination)

  return new Promise((resolve) => {
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      source.disconnect()
      gain.disconnect()
      resolve()
    }

    source.onended = settle
    const fallbackMs = Math.ceil((buffer.duration || 1) * 1000) + 500
    const timer = setTimeout(settle, fallbackMs)

    source.start()
  })
}

/**
 * Wakes a suspended context, reporting whether it actually ended up running.
 *
 * Gates playback only. Repairing a context that won't wake is `unlock`'s job.
 */
async function resume(): Promise<boolean> {
  const context = ensureContext()
  if (!context) return false
  if (context.state === 'running') return true

  try {
    let id: ReturnType<typeof setTimeout>
    await Promise.race([
      context.resume().finally(() => clearTimeout(id)),
      new Promise<never>((_, reject) => {
        id = setTimeout(() => reject(new Error('timeout')), RESUME_TIMEOUT_MS)
      })
    ])
  } catch {
    return false
  }

  return (context.state as AudioContextState) === 'running'
}

/**
 * Reopens audio, from inside a user gesture.
 *
 * Never introduce an await before the rebuild — work after one falls outside
 * the gesture and stops counting. →[K:ios-audio-interruption]
 *
 * @param force - Rebuild even when the context claims to be running, for
 *   callers that know its own account of itself can't be trusted.
 */
function unlock(force = false): void {
  const current = ensureContext()
  if (!current) return

  if (current.state === 'running' && !force) {
    markUnlocked()
    return
  }

  // A context born outside a gesture can never be revived, so discard it. →[K:ios-audio-interruption]
  current.removeEventListener('statechange', notifyState)
  void current.close()

  const fresh = createContext()
  if (!fresh) return

  primeOutput(fresh)
  void fresh.resume()
  if (fresh.state === 'running') markUnlocked()
}

function onStateChange(cb: () => void): () => void {
  state_listeners.add(cb)
  return () => state_listeners.delete(cb)
}

function isUnlocked(): boolean {
  return unlocked
}

function onUnlock(cb: () => void): () => void {
  unlock_listeners.add(cb)
  if (unlocked) cb()
  return () => unlock_listeners.delete(cb)
}

function state(): AudioContextState | undefined {
  return ctx?.state
}

export default {
  decode,
  play,
  resume,
  unlock,
  onStateChange,
  onUnlock,
  isUnlocked,
  state
}
