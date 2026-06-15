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
type Playback = { ended: Promise<void> }

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

// The context fires statechange on every transition; the first 'running' is also
// the unlock signal, since a suspended context can never reach it without a gesture.
function notifyState(): void {
  if (ctx?.state === 'running') markUnlocked()
  state_listeners.forEach((cb) => cb())
}

// Unlock is a one-shot edge fired when the context first reaches 'running' —
// either via the statechange event or the synchronous check in unlock() when a
// fresh context is born running. It gates all playback.
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

function play(buffer: AudioBuffer, volume: number): Playback {
  if (!ctx || ctx.state !== 'running') return { ended: Promise.resolve() }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  const gain = ctx.createGain()
  gain.gain.value = volume
  source.connect(gain).connect(ctx.destination)

  const ended = new Promise<void>((resolve) => {
    source.onended = () => {
      source.disconnect()
      gain.disconnect()
      resolve()
    }
  })

  source.start()
  return { ended }
}

// Wake a suspended context and report whether it ended up running. Used to gate
// playback; the actual unlock/rebuild lives in unlock().
async function resume(): Promise<boolean> {
  const context = ensureContext()
  if (!context) return false
  if (context.state === 'running') return true

  try {
    await context.resume()
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

function onUnlock(cb: () => void): () => void {
  if (unlocked) {
    cb()
    return () => {}
  }
  unlock_listeners.add(cb)
  return () => unlock_listeners.delete(cb)
}

function state(): AudioContextState | undefined {
  return ctx?.state
}

export type { Playback }
export default { decode, play, resume, unlock, onStateChange, onUnlock, state }
