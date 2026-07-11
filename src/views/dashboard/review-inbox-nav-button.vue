<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
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
  <ui-button
    :data-testid="`review-inbox__${direction}-btn`"
    :icon-left="direction === 'prev' ? 'chevron-left' : 'chevron-right'"
    icon-only
    :disabled="disabled"
    data-theme="brown-50"
    class="absolute! top-1/2 -translate-y-1/2 z-20"
    :class="direction === 'prev' ? '-left-4' : '-right-4'"
    :sfx="{ press: 'snappy_button_5' }"
    @press="emit('press')"
  >
    {{ t(direction === 'prev' ? 'review-inbox.prev-button' : 'review-inbox.next-button') }}
  </ui-button>
</template>
