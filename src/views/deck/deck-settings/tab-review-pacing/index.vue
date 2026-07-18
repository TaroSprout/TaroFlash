<script setup lang="ts">
import { inject, provide } from 'vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import PresetHeader from './preset-header.vue'
import GeneralSection from './general-section.vue'
import LimitsSection from './limits-section.vue'
import SchedulingSection from './scheduling-section.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { pacingFieldsKey, usePacingFields } from './use-pacing-fields'
import DeckSaveButton from '../deck-save-button.vue'

const { deck, draft } = inject(deckEditorKey)!

provide(pacingFieldsKey, usePacingFields(deck!, draft))
</script>

<template>
  <section-list
    data-testid="tab-review-pacing"
    class="@container flex-1 px-(--deck-settings-padding) pb-(--deck-settings-padding)"
  >
    <preset-header class="md:pb-4" />

    <div
      data-testid="tab-review-pacing__columns"
      class="grid flex-1 grid-cols-1 gap-8 @min-[46rem]:grid-cols-2 md:gap-12"
    >
      <div data-testid="tab-review-pacing__deck-column" class="flex flex-col gap-8 md:gap-12">
        <general-section />
        <limits-section />
      </div>

      <div data-testid="tab-review-pacing__scheduling-column" class="flex flex-col gap-8">
        <scheduling-section
          class="rounded-6 bg-brown-200 dark:bg-stone-700 px-6 pb-8 pt-12 bgx-bank-note bgx-size-20 bgx-opacity-50 dark:bgx-opacity-2"
        />
        <deck-save-button class="mt-auto" />
      </div>
    </div>
  </section-list>
</template>
