<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'
import UiProgressBar from '@/components/ui-kit/progress-bar.vue'

type SessionProgressProps = {
  editing: boolean
  saving: boolean
  is_cover: boolean
  reviewed: number
  total: number
}

const { reviewed, total } = defineProps<SessionProgressProps>()
</script>

<template>
  <div data-testid="study-session__progress" class="w-full">
    <div
      v-if="editing"
      data-testid="study-session__save-status"
      class="flex items-center justify-center gap-1 text-lg text-brown-700 dark:text-brown-300"
    >
      <ui-icon :src="saving ? 'loading-dots' : 'check'" class="h-5 w-5" />
      <span class="text-sm">
        {{ saving ? $t('study-session.flashcard.saving') : $t('study-session.flashcard.saved') }}
      </span>
    </div>

    <div v-else class="relative w-full">
      <p
        data-testid="study-session__studying-count"
        class="absolute inset-0 flex items-center justify-center text-center text-brown-700 transition-opacity duration-300 dark:text-brown-100 bg-brown-100 rounded-3 bgx-diagonal-stripes bgx-color-(--color-brown-300) border-2 border-brown-100"
        :class="is_cover ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      >
        {{ $t('study-session.flashcard.studying-count', total) }}
      </p>

      <ui-progress-bar
        data-theme="blue-500"
        :value="reviewed"
        :max="total"
        :label="`${reviewed}/${total}`"
        class="transition-opacity duration-300"
        :class="is_cover ? 'opacity-0' : 'opacity-100'"
      />
    </div>
  </div>
</template>
