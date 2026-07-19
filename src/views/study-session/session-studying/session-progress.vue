<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiProgressBar from '@/components/ui-kit/progress-bar.vue'
import { useInjectedStudySessionController } from '@/views/study-session/composables/session-controller'

const { editing, saving, is_cover, current_index, cards } = useInjectedStudySessionController()

const total = computed(() => cards.value.length)
</script>

<template>
  <div data-testid="study-session__progress" class="w-full">
    <div
      v-if="editing"
      data-testid="study-session__save-status"
      class="flex items-center justify-center gap-1 text-lg text-ink"
    >
      <ui-icon :src="saving ? 'loading-dots' : 'check'" class="h-5 w-5" />
      <span class="text-sm">
        {{ saving ? $t('study-session.flashcard.saving') : $t('study-session.flashcard.saved') }}
      </span>
    </div>

    <div v-else class="relative w-full">
      <p
        data-testid="study-session__studying-count"
        class="absolute inset-0 flex items-center justify-center text-center text-brown-700 transition-opacity duration-300 dark:text-brown-100 bg-element rounded-3 bgx-diagonal-stripes bgx-color-(--color-brown-300) dark:bgx-color-(--color-stone-950) border-2 border-element"
        :class="is_cover ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      >
        {{ $t('study-session.flashcard.studying-count', total) }}
      </p>

      <ui-progress-bar
        data-theme="blue-500"
        data-theme-dark="blue-650"
        :value="current_index"
        :max="total"
        :label="`${current_index}/${total}`"
        class="transition-opacity duration-300"
        :class="is_cover ? 'opacity-0' : 'opacity-100'"
      />
    </div>
  </div>
</template>
