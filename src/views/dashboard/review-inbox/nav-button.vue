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
    v-if="!disabled"
    :data-testid="`review-inbox__${direction}-btn`"
    :icon-left="direction === 'prev' ? 'chevron-left' : 'chevron-right'"
    icon-only
    :disabled="disabled"
    data-theme="brown-50"
    class="absolute! top-1/2 z-20 -translate-y-2/3 shadow-xs"
    :class="direction === 'prev' ? '-left-3 sm:-left-8' : '-right-3 sm:-right-8'"
    size="lg"
    :sfx="{ press: 'snappy_button_5' }"
    @press="emit('press')"
  >
    {{ t(direction === 'prev' ? 'review-inbox.prev-button' : 'review-inbox.next-button') }}
  </ui-button>
</template>
