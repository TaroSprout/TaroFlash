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

  function tick() {
    if (!el) return
    current_time.value = el.currentTime
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
    if (el) current_time.value = el.currentTime
  }

  function onTimeUpdate() {
    if (el && !is_playing.value) current_time.value = el.currentTime
  }

  function bind(next: HTMLAudioElement) {
    el = next
    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onPause)
    el.addEventListener('timeupdate', onTimeUpdate)
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
    el.currentTime = seconds
    current_time.value = seconds
  }

  function play() {
    el?.play()
  }

  function pause() {
    el?.pause()
  }

  return { current_time, duration, is_playing, play, pause, seek }
}
