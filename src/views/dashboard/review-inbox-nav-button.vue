<script setup lang="ts">
import UiTappable from '@/components/ui-kit/tappable.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { useI18n } from 'vue-i18n'

type ReviewInboxNavButtonProps = {
  direction: 'prev' | 'next'
  disabled?: boolean
}

const { direction, disabled = false } = defineProps<ReviewInboxNavButtonProps>()

const emit = defineEmits<{ press: [] }>()

const { t } = useI18n()
</script>

<template>
  <ui-tappable
    :data-testid="`review-inbox__${direction}-btn`"
    :aria-label="t(direction === 'prev' ? 'review-inbox.prev-button' : 'review-inbox.next-button')"
    class="flex shrink-0 w-10 items-center justify-center text-brown-700 dark:text-brown-100 touch-manipulation cursor-pointer"
    :class="disabled && 'opacity-40 pointer-events-none'"
    :sfx="{ press: 'snappy_button_5' }"
    bgx_color="var(--color-brown-500)"
    @tap="emit('press')"
  >
    <ui-icon :src="direction === 'prev' ? 'chevron-left' : 'chevron-right'" class="h-5 w-5" />
  </ui-tappable>
</template>
