<script setup lang="ts">
import { computed, inject } from 'vue'
import {
  readerActiveWordKey,
  readerMatchesKey,
  readerSelectionKey
} from '@/composables/audio-reader/reader-highlights'

// Leading / trailing whitespace + punctuation — the same edges `cleanTerm`
// strips when matching, so the underline hugs the term's own characters and
// never bridges the gap (or a comma) to a neighbouring card.
const LEADING_EDGE = /^[\p{P}\s]+/u
const TRAILING_EDGE = /[\p{P}\s]+$/u

const { display, index, reading } = defineProps<{
  display: string
  index: number
  reading?: string
}>()

const selection = inject(readerSelectionKey, null)
const active_word = inject(readerActiveWordKey, null)
const matches = inject(readerMatchesKey, null)

const selected = computed(() => {
  const range = selection?.value
  return !!range && index >= range.lo && index <= range.hi
})

const playing = computed(() => active_word?.value === index)

// The card match this word sits in (carries the owning deck's theme), or null.
// The member already has a card for a matched word — marked with a marker-style
// underline in the deck's colour so it reads as "you know this one".
const match = computed(() => matches?.value?.get(index) ?? null)
const matched = computed(() => !!match.value)

// Underline in the deck cover's theme — light from `theme`, dark from
// `theme_dark` — falling back to a neutral marker pair only when the deck cover
// carries no theme at all.
const highlight_theme = computed(() => match.value?.theme ?? 'yellow-400')
const highlight_theme_dark = computed(() =>
  match.value?.theme ? match.value.theme_dark : 'yellow-600'
)

// Split the word into [lead][core][trail] and underline only the core. The
// first word of a match drops its leading edge, the last its trailing edge;
// interior words keep both so a multi-word phrase stays one continuous line.
const lead = computed(() =>
  match.value && index === match.value.lo ? (display.match(LEADING_EDGE)?.[0] ?? '') : ''
)
const trail = computed(() =>
  match.value && index === match.value.hi ? (display.match(TRAILING_EDGE)?.[0] ?? '') : ''
)
const core = computed(() => display.slice(lead.value.length, display.length - trail.value.length))

// Selection wins over the audio cue: a selected word sits on the blue pill and
// needs white text to stay legible, even while it's the word being read.
const text_color = computed(() => {
  if (selected.value) return 'text-white'
  if (playing.value) return 'text-blue-500 dark:text-blue-650'
  return ''
})
</script>

<template>
  <ruby
    data-testid="transcript-word"
    :data-word-index="index"
    :data-word-text="display"
    :data-active="selected"
    :data-playing="playing"
    :data-highlight="matched"
    :data-theme="matched ? highlight_theme : undefined"
    :data-theme-dark="matched ? highlight_theme_dark : undefined"
    class="group/word cursor-pointer transition-colors duration-700 ease-out data-[playing=true]:duration-100 data-[active=true]:duration-100"
    :class="text_color"
    ><span
      data-word-base
      class="inline-block origin-center leading-none transition-transform duration-700 ease-out group-data-[playing=true]/word:scale-115 group-data-[playing=true]/word:duration-100"
      >{{ lead
      }}<span
        :class="
          matched && 'underline decoration-(--theme-primary) decoration-3 underline-offset-[0.18em]'
        "
        >{{ core }}</span
      >{{ trail }}</span
    ><rt
      v-if="reading"
      data-testid="transcript-word__reading"
      class="-translate-y-1 select-none text-base text-brown-500 dark:text-grey-400"
      >{{ reading }}</rt
    ></ruby
  >
</template>
