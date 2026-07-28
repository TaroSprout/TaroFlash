<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiOptionsPanel, { type OptionsPanelEntry } from '@/components/ui-kit/options-panel/index.vue'
import type { SummaryCategory, SummaryData } from './aggregate'

type StatsPanelProps = { summary: SummaryData }

// Display order; `correct` leads because it's the headline stat.
const CATEGORIES: { key: SummaryCategory; icon: string }[] = [
  { key: 'correct', icon: 'check' },
  { key: 'new', icon: 'card-add' },
  { key: 'strengthened', icon: 'card-lift' },
  { key: 'weakened', icon: 'card-place' },
  { key: 'stuck', icon: 'card-remove' }
]

const { summary } = defineProps<StatsPanelProps>()

const emit = defineEmits<{
  select: [category: SummaryCategory]
}>()

const { t } = useI18n()

// Empty categories drop out, except `correct` — a zero there is the point.
const entries = computed<OptionsPanelEntry[]>(() =>
  CATEGORIES.filter(({ key }) => key === 'correct' || summary.groups[key].length > 0).map(
    ({ key, icon }) => ({
      value: key,
      icon,
      label: t(`session-summary.stat.${key}-label`, summary.groups[key].length)
    })
  )
)
</script>

<template>
  <ui-options-panel
    data-testid="session-summary__stats"
    :entries="entries"
    size="lg"
    :sfx="{ press: 'snappy_button_5' }"
    @select="emit('select', $event as SummaryCategory)"
  />
</template>
