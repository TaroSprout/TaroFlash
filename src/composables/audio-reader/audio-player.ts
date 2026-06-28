import { onUnmounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

/**
 * Wrap a native `<audio>` element with reactive playback state.
 *
 * Uses a requestAnimationFrame loop while playing so `current_time` updates
 * smoothly for the transcript highlight (the `timeupdate` event alone fires too
 * coarsely, ~4x/sec); it reconciles against `timeupdate` while paused/seeking.
 * Native `<audio>` (not Howler) because it streams via HTTP range requests and
 * gives free seeking — Howler is for short SFX.
 *
 * @param target - the audio element (template ref); binding follows it as it mounts/unmounts.
 * @example
 * const audio = useTemplateRef('audio')
 * const { current_time, is_playing, seek } = useAudioPlayer(audio)
 */
export function useAudioPlayer(target: MaybeRefOrGetter<HTMLAudioElement | null>) {
  const current_time = ref(0)
  const duration = ref(0)
  const is_playing = ref(false)
  const playback_rate = ref(1)
  // True once the bound source's metadata is in (so seeking sticks); flips back to
  // false on `emptied` when the src swaps to another chapter, awaiting its load.
  const loaded = ref(false)

  let el: HTMLAudioElement | null = null
  let raf = 0

  // When set, playback is bounded to a single clip: the tick loop pauses the
  // moment it reaches this time. Cleared by any pause, seek, or open-ended play.
  let clip_end: number | null = null

  // A resume offset to apply on the next play(). iOS Safari ignores `currentTime`
  // writes made on load (no user gesture, media not yet seekable), so the seek is
  // deferred to the play tap — the one place it reliably lands. Cleared by any
  // manual seek/clip so a user's own scrub wins over a stale resume.
  let pending_seek: number | null = null

  function tick() {
    if (!el) return
    current_time.value = el.currentTime

    if (clip_end !== null && el.currentTime >= clip_end) {
      pause()
      return
    }

    raf = requestAnimationFrame(tick)
  }

  function startTicking() {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(tick)
  }

  function stopTicking() {
    cancelAnimationFrame(raf)
    raf = 0
  }

  function onLoaded() {
    if (el) duration.value = el.duration || 0
    loaded.value = true
  }

  function onEmptied() {
    loaded.value = false
    duration.value = 0
  }

  function onPlay() {
    is_playing.value = true
    startTicking()
  }

  function onPause() {
    is_playing.value = false
    stopTicking()
    clip_end = null
    if (el) current_time.value = el.currentTime
  }

  // The rAF tick is the smooth, per-frame updater while playing, but it stalls
  // under heavy main-thread load (a long task, a scroll/animation frame burst),
  // leaving the transcript cursor lagging the audio until something snaps it back.
  // `timeupdate` fires from the media pipeline itself (~4 Hz, independent of rAF),
  // so syncing here too — playing or not — is a backstop that lets the cursor
  // self-heal instead of needing a manual seek.
  function onTimeUpdate() {
    if (el) current_time.value = el.currentTime
  }

  // Background tabs freeze rAF, so the tick loop stalls and `current_time` drifts
  // behind the audio (which keeps playing — the point of pocket listening). On the
  // way back to the foreground, snap to the element's real position so the
  // transcript cursor lands on the right word at once, and revive the loop if we're
  // still playing rather than waiting for the next thawed frame.
  function onVisible() {
    if (!el || document.hidden) return
    current_time.value = el.currentTime
    if (is_playing.value) startTicking()
  }

  function bind(next: HTMLAudioElement) {
    el = next
    el.playbackRate = playback_rate.value
    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('emptied', onEmptied)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onPause)
    el.addEventListener('timeupdate', onTimeUpdate)
    document.addEventListener('visibilitychange', onVisible)
    if (el.readyState >= 1) onLoaded()
  }

  function unbind() {
    stopTicking()
    loaded.value = false
    if (!el) return
    el.removeEventListener('loadedmetadata', onLoaded)
    el.removeEventListener('emptied', onEmptied)
    el.removeEventListener('play', onPlay)
    el.removeEventListener('pause', onPause)
    el.removeEventListener('ended', onPause)
    el.removeEventListener('timeupdate', onTimeUpdate)
    document.removeEventListener('visibilitychange', onVisible)
    el = null
  }

  watch(
    () => toValue(target),
    (next) => {
      unbind()
      if (next) bind(next)
    },
    { immediate: true }
  )

  onUnmounted(unbind)

  /** Move playback to `seconds` and reflect it immediately (don't wait for timeupdate). */
  function seek(seconds: number) {
    if (!el) return
    clip_end = null
    pending_seek = null
    el.currentTime = seconds
    current_time.value = seconds
  }

  /**
   * Mark a position to resume from on the next play(), reflecting it now so the
   * transcript highlight lands there while paused. The element itself isn't
   * seeked until play() runs inside the user's tap — iOS Safari drops a
   * `currentTime` write made on load, leaving audio at 0 while the highlight
   * jumped ahead. A manual seek before play clears this.
   */
  function resumeAt(seconds: number) {
    pending_seek = seconds
    current_time.value = seconds
  }

  /** Jump `delta` seconds relative to now (negative rewinds), clamped to `[0, duration]`. */
  function skip(delta: number) {
    seek(Math.min(Math.max(current_time.value + delta, 0), duration.value))
  }

  /** Set playback speed (e.g. 1.5 for 1.5x); applied live and remembered for re-binds. */
  function setPlaybackRate(rate: number) {
    playback_rate.value = rate
    if (el) el.playbackRate = rate
  }

  function play() {
    clip_end = null
    if (!el) return

    // Apply a deferred resume here, inside the tap, where iOS honours the seek.
    if (pending_seek !== null) {
      el.currentTime = pending_seek
      current_time.value = pending_seek
      pending_seek = null
    }

    el.play()
  }

  function pause() {
    el?.pause()
  }

  /** Play just the span `[start, end]` — seek to `start`, play, and auto-pause at `end`. */
  function playClip(start: number, end: number) {
    if (!el) return
    clip_end = end
    pending_seek = null
    el.currentTime = start
    current_time.value = start
    el.play()
  }

  return {
    current_time,
    duration,
    is_playing,
    playback_rate,
    loaded,
    play,
    pause,
    seek,
    resumeAt,
    skip,
    setPlaybackRate,
    playClip
  }
}

export type AudioPlayer = ReturnType<typeof useAudioPlayer>
