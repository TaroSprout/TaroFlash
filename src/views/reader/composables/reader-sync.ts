import { onBeforeUnmount, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'

const SETTLE_TIMEOUT_MS = 1000

export type PageAudioSyncOptions = {
  is_playing: MaybeRefOrGetter<boolean>
  active_word: MaybeRefOrGetter<number>
  at_rest: MaybeRefOrGetter<boolean>
  spreadOfWord: (word_index: number) => number
  firstWordOfSpread: (spread: number) => number | undefined
  seekToWord: (word_index: number) => void
}

export type PageAudioSync = {
  desired_spread: Ref<number>
  onTurn: (spread: number) => void
}

export function usePageAudioSync(options: PageAudioSyncOptions): PageAudioSync {
  const { is_playing, active_word, at_rest, spreadOfWord, firstWordOfSpread, seekToWord } = options

  const desired_spread = ref(0)

  let engaged = false
  let settle_target: number | null = null
  let settle_timer: ReturnType<typeof setTimeout> | undefined

  onBeforeUnmount(() => clearTimeout(settle_timer))

  function beginSettle(spread: number) {
    settle_target = spread
    clearTimeout(settle_timer)
    settle_timer = setTimeout(() => (settle_target = null), SETTLE_TIMEOUT_MS)
  }

  function onTurn(spread: number) {
    engaged = true
    desired_spread.value = spread

    const word = firstWordOfSpread(spread)
    if (word === undefined) return

    beginSettle(spread)
    seekToWord(word)
  }

  function follow(word: number) {
    if (word < 0) return

    const target = spreadOfWord(word)

    if (!engaged) {
      desired_spread.value = target
      return
    }

    if (!toValue(is_playing) || !toValue(at_rest)) return

    if (settle_target !== null) {
      if (target !== settle_target) return
      settle_target = null
    }

    desired_spread.value = target
  }

  watch(
    () => toValue(is_playing),
    (playing) => (engaged ||= playing)
  )

  watch(() => toValue(active_word), follow, { immediate: true, flush: 'post' })

  return { desired_spread, onTurn }
}
