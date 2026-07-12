<script setup lang="ts">
import { useI18n } from 'vue-i18n'

type SortOption = 'custom' | 'date-created' | 'last-updated' | 'last-studied'

type DeckGridSortOptionsProps = {
  selected?: SortOption
}

const { selected = 'custom' } = defineProps<DeckGridSortOptionsProps>()

const { t } = useI18n()

const OPTIONS: { key: SortOption; label_key: string }[] = [
  { key: 'custom', label_key: 'dashboard.deck-grid-sort.custom-label' },
  { key: 'date-created', label_key: 'dashboard.deck-grid-sort.date-created-label' },
  { key: 'last-updated', label_key: 'dashboard.deck-grid-sort.last-updated-label' },
  { key: 'last-studied', label_key: 'dashboard.deck-grid-sort.last-studied-label' }
]
</script>

<template>
  <div data-testid="deck-grid-sort-options" class="flex gap-8 text-brown-500">
    <span
      v-for="option in OPTIONS"
      :key="option.key"
      :data-testid="`deck-grid-sort-options__${option.key}`"
      :data-active="option.key === selected"
      class="cursor-pointer data-[active=true]:text-brown-700 data-[active=true]:underline data-[active=true]:underline-offset-8 dark:data-[active=true]:text-brown-100"
    >
      {{ t(option.label_key) }}
    </span>
  </div>
</template>
