<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'
import UiProgressBar from '@/components/ui-kit/progress-bar.vue'
import { computed, useTemplateRef } from 'vue'

type SessionProgressProps = {
  editing: boolean
  saving: boolean
  current_index: number
  total: number
}

const { current_index, total } = defineProps<SessionProgressProps>()

const root = useTemplateRef('root')
defineExpose({ root })

const position = computed(() => Math.min(current_index + 1, total))
</script>

<template>
  <div ref="root" data-testid="study-session__progress" class="w-full">
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

    <ui-progress-bar
      v-else
      data-theme="blue-500"
      :value="position"
      :max="total"
      :label="`${position}/${total}`"
    />
  </div>
</template>
