<script setup lang="ts">
import { useI18n } from 'vue-i18n'

export type SortOption = 'custom' | 'date-created' | 'last-updated'

type DeckGridSortOptionsProps = {
  selected?: SortOption
}

const { selected = 'custom' } = defineProps<DeckGridSortOptionsProps>()

const emit = defineEmits<{ select: [option: SortOption] }>()

const { t } = useI18n()

const OPTIONS: { key: SortOption; label_key: string }[] = [
  { key: 'custom', label_key: 'dashboard.deck-grid-sort.custom-label' },
  { key: 'date-created', label_key: 'dashboard.deck-grid-sort.date-created-label' },
  { key: 'last-updated', label_key: 'dashboard.deck-grid-sort.last-updated-label' }
]
</script>

<template>
  <div
    data-testid="deck-grid-sort-options"
    class="flex gap-8 text-brown-500 overflow-x-auto scroll-hidden pb-2"
  >
    <span
      v-for="option in OPTIONS"
      :key="option.key"
      :data-testid="`deck-grid-sort-options__${option.key}`"
      :data-active="option.key === selected"
      class="cursor-pointer shrink-0 data-[active=true]:text-brown-700 data-[active=true]:underline data-[active=true]:underline-offset-8 dark:data-[active=true]:text-brown-100"
      @click="emit('select', option.key)"
    >
      {{ t(option.label_key) }}
    </span>
  </div>
</template>
