<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import { useI18n } from 'vue-i18n'

/** The header-end action on a category page — mirrors the header's leading action, but toggles multi-select. */
type SummarySelectButtonProps = {
  is_selecting?: boolean
}

const { is_selecting = false } = defineProps<SummarySelectButtonProps>()

const emit = defineEmits<{
  (e: 'press'): void
}>()

const { t } = useI18n()
</script>

<template>
  <ui-button
    neutral
    data-testid="session-summary__select-button"
    :icon-left="is_selecting ? 'check' : 'data-check'"
    icon-only
    rounded-full
    @press="emit('press')"
  >
    {{
      is_selecting
        ? t('session-summary.select-button.done')
        : t('session-summary.select-button.select')
    }}
  </ui-button>
</template>
