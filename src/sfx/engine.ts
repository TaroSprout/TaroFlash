/**
 * Web Audio engine for one-shot sound effects.
 *
 * Replaces Howler for SFX. We only ever used a sliver of Howler — load, one-shot
 * play, per-sound volume — and the part we leaned on, its AudioContext
 * lifecycle, is exactly what wedges on iOS: locking the phone or switching apps
 * drops the context into WebKit's non-standard 'interrupted' state, which
 * `resume()` often can't revive. Owning the context lets us close and rebuild it
 * on demand. AudioBuffers aren't bound to a context, so decoded sounds survive a
 * rebuild untouched — only the cheap one-shot BufferSourceNodes are recreated
 * per play.
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

// The context fires statechange on every transition. 'running' fires the unlock
// signal. Any non-running state resets the latch so the next 'running' transition
// re-fires unlock_listeners — allowing queued sounds to retry after recovery.
function notifyState(): void {
  if (ctx?.state === 'running') {
    markUnlocked()
  } else {
    unlocked = false
  }
  state_listeners.forEach((cb) => cb())
}

// Fires whenever the context transitions to 'running' — either via statechange
// or the synchronous check in unlock() when a fresh context is born running.
// notifyState() resets `unlocked` on every non-running transition, so this fires
// again on each recovery, re-draining any queued sounds.
function markUnlocked(): void {
  if (unlocked) return
  unlocked = true
  unlock_listeners.forEach((cb) => cb())
}

// iOS Safari only opens audio output when a source is *started* inside the
// unlocking gesture — resume() alone leaves it muted. A one-sample silent buffer
// does the trick. Best-effort and fully guarded: priming must never break the
// resume/unlock path (an earlier unguarded version rejected resume() and killed
// audio on every platform). Synchronous (no await before start) so it stays
// within the user gesture.
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

// Resumes the context if needed, starts the buffer, and returns a promise that
// settles when the sound ends. The fallback timer ensures settlement even when
// the context suspends mid-play and onended never fires.
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

// Wake a suspended context and report whether it ended up running. Used to gate
// playback; the actual unlock/rebuild lives in unlock().
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

// Synchronous unlock for the user gesture. Everything here runs inside the
// gesture's synchronous turn — iOS ignores audio work that happens after an await.
function unlock(): void {
  const current = ensureContext()
  if (!current) return

  if (current.state === 'running') {
    markUnlocked()
    return
  }

  // A context created outside a user gesture is unrecoverable on iOS — its
  // resume() promise never settles, and the same is true after an interruption.
  // Rebuild synchronously inside this gesture so the new context is
  // gesture-blessed. Buffers are context-agnostic, so nothing reloads.
  // markUnlocked then fires via statechange once the fresh context reaches
  // running (or immediately below if it is born running).
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

export default { decode, play, resume, unlock, onStateChange, onUnlock, isUnlocked, state }
