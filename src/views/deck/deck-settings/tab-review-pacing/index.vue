<script setup lang="ts">
import { inject, provide } from 'vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import PresetHeader from './preset-header.vue'
import GeneralSection from './general-section.vue'
import LimitsSection from './limits-section.vue'
import SchedulingSection from './scheduling-section.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { pacingFieldsKey, usePacingFields } from './use-pacing-fields'
import { presetActionsKey, usePresetActions } from './use-preset-actions'
import DeckSaveButton from '../deck-save-button.vue'

// This page is full-bleed, so `--deck-settings-padding` is 0 and the header row
// would sit flush against the scrolling container's edge — clipping the preset
// chip's 2px hover outline, which paints outside its border box. `pt-0.5` is
// just enough room for it.
//
// The scheduling panel's `bgx-*` texture brings `isolation: isolate` with it
// (its -1 pseudo-element needs the stacking context), which traps the steps
// dropdowns' popovers inside the panel. `z-10` lifts that whole context above
// the save button below it, which would otherwise paint over an open menu.
const { deck, draft } = inject(deckEditorKey)!

const pacing = usePacingFields(deck!, draft)

provide(pacingFieldsKey, pacing)
provide(presetActionsKey, usePresetActions(pacing, draft, deck!))
</script>

<template>
  <section-list
    data-testid="tab-review-pacing"
    class="@container flex-1 px-(--deck-settings-padding) pt-0.5 pb-(--deck-settings-padding)"
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
          data-depth="1"
          class="rounded-6 bg-brown-200 dark:bg-stone-700 z-10 px-6 pb-8 pt-12 bgx-bank-note bgx-size-20 bgx-opacity-50 dark:bgx-opacity-2"
        />
        <deck-save-button class="mt-auto" />
      </div>
    </div>
  </section-list>
</template>
