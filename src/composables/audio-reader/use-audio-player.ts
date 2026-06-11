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

  let el: HTMLAudioElement | null = null
  let raf = 0

  // When set, playback is bounded to a single clip: the tick loop pauses the
  // moment it reaches this time. Cleared by any pause, seek, or open-ended play.
  let clip_end: number | null = null

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

  function onTimeUpdate() {
    if (el && !is_playing.value) current_time.value = el.currentTime
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
    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onPause)
    el.addEventListener('timeupdate', onTimeUpdate)
    document.addEventListener('visibilitychange', onVisible)
    if (el.readyState >= 1) onLoaded()
  }

  function unbind() {
    stopTicking()
    if (!el) return
    el.removeEventListener('loadedmetadata', onLoaded)
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
    el.currentTime = seconds
    current_time.value = seconds
  }

  function play() {
    clip_end = null
    el?.play()
  }

  function pause() {
    el?.pause()
  }

  /** Play just the span `[start, end]` — seek to `start`, play, and auto-pause at `end`. */
  function playClip(start: number, end: number) {
    if (!el) return
    clip_end = end
    el.currentTime = start
    current_time.value = start
    el.play()
  }

  return { current_time, duration, is_playing, play, pause, seek, playClip }
}

export type AudioPlayer = ReturnType<typeof useAudioPlayer>
