<script setup lang="ts">
import PagedSegment from '@/views/audio-reader/lesson/paged/segment.vue'
import PagedControls from '@/views/audio-reader/lesson/paged/controls.vue'
import type { Page } from '@/composables/audio-reader/pagination'
import type { AudioPlayer } from '@/composables/audio-reader/audio-player'

type PagedPageProps = {
  slices: Page
  player: AudioPlayer
  // The primary page carries the controls (and, in split mode, the reserved
  // translation band). In a two-page spread that's the left page; on phone it's
  // the only page.
  isPrimary?: boolean
  // Split translation mode: reserve a band under the text showing the playing
  // line's translation, divided from the text by a rule.
  splitMode?: boolean
  splitTranslation?: string | null
}

const {
  slices,
  player,
  isPrimary = false,
  splitMode = false,
  splitTranslation = null
} = defineProps<PagedPageProps>()

const emit = defineEmits<{ (e: 'open-settings'): void }>()
</script>

<template>
  <div data-testid="paged-page" class="flex h-full flex-col">
    <div
      data-testid="paged-page__text"
      class="min-h-0 flex-1 select-none overflow-hidden text-4xl leading-[2.5] text-ink"
    >
      <paged-segment
        v-for="(slice, i) in slices"
        :key="`${slice.paragraph_index}-${slice.words[0]?.index}`"
        :class="{ 'mt-6': i > 0 }"
        :words="slice.words"
        :paragraph-index="slice.paragraph_index"
        :translation="slice.translation"
        :show-gloss="slice.show_gloss"
      />
    </div>

    <template v-if="isPrimary">
      <div
        v-if="splitMode"
        data-testid="paged-page__split"
        class="flex h-(--paged-split-h) shrink-0 items-start overflow-hidden border-t border-line pt-3 text-lg text-ink-muted leading-[1.5]"
      >
        {{ splitTranslation }}
      </div>

      <div
        data-no-swipe
        data-testid="paged-page__controls"
        class="flex h-(--paged-controls-h) shrink-0 items-center"
      >
        <paged-controls :player="player" @open-settings="emit('open-settings')" />
      </div>
    </template>
  </div>
</template>
