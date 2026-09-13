<script setup lang="ts">
import { useTemplateRef } from 'vue'
import {
  translationCrossfadeEnter,
  translationCrossfadeLeave
} from '@/utils/animations/translation-crossfade'
import { useStageHeight } from '@/components/layout-kit/stage/use-stage-height'

type TranslationZoneProps = {
  // The line's translation to show, or null to show nothing (a line with no
  // translation shows an empty band, never the previous line's text).
  translation?: string | null
}

const { translation = null } = defineProps<TranslationZoneProps>()

const wrapper = useTemplateRef<HTMLElement>('wrapper')
const content = useTemplateRef<HTMLElement>('content')

// A cheap, isolated band — follows its content's height through the stage.
useStageHeight(wrapper, content)
</script>

<template>
  <div ref="wrapper" data-testid="translation-zone" class="w-full">
    <div
      ref="content"
      data-testid="translation-zone__body"
      class="grid min-h-12 w-full place-items-center px-4 py-3 text-center"
    >
      <transition
        :css="false"
        @enter="translationCrossfadeEnter"
        @leave="translationCrossfadeLeave"
      >
        <p
          v-if="translation"
          :key="translation"
          data-testid="translation-zone__text"
          class="[grid-area:1/1] text-lg text-ink-muted leading-[1.5]"
        >
          {{ translation }}
        </p>
      </transition>
    </div>
  </div>
</template>
