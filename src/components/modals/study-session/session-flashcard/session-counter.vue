<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'

type SessionCounterProps = {
  editing: boolean
  saving: boolean
  current_index: number
  total: number
  is_cover: boolean
}

const { editing, saving, current_index, total, is_cover } = defineProps<SessionCounterProps>()
</script>

<template>
  <div
    data-testid="study-session__counter"
    class="text-brown-700 dark:text-brown-300 text-lg flex items-center gap-1"
    :class="{ invisible: is_cover }"
  >
    <template v-if="editing">
      <ui-icon :src="saving ? 'loading-dots' : 'check'" class="h-5 w-5" />
      <span data-testid="study-session__save-status" class="text-sm">
        {{ saving ? $t('study-session.flashcard.saving') : $t('study-session.flashcard.saved') }}
      </span>
    </template>
    <template v-else>
      {{ current_index + 1 }}<span class="text-sm">/{{ total }}</span>
    </template>
  </div>
</template>
