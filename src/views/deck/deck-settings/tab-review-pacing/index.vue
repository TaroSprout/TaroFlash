<script setup lang="ts">
import { inject, provide } from 'vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import PresetHeader from './preset-header.vue'
import GeneralSection from './general-section.vue'
import PacingColumn from './pacing-column.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { usePacingFields } from './use-pacing-fields'
import { pacingFieldsKey } from './pacing-fields'
import DeckSaveButton from '../deck-save-button.vue'

const { deck, draft } = inject(deckEditorKey)!

provide(pacingFieldsKey, usePacingFields(deck!, draft))
</script>

<template>
  <section-list
    data-testid="tab-review-pacing"
    class="@container px-(--deck-settings-padding) pb-(--deck-settings-padding)"
  >
    <preset-header />

    <div
      data-testid="tab-review-pacing__columns"
      class="grid grid-cols-1 items-start gap-8 @min-[46rem]:grid-cols-2 @min-[46rem]:gap-12"
    >
      <general-section />
      <pacing-column />
    </div>

    <deck-save-button />
  </section-list>
</template>
