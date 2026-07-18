<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiToggle from '@/components/ui-kit/toggle.vue'
import UiOptionGroup from '@/components/ui-kit/option-group.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import PacingSection from './pacing-section.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import DeckSaveButton from '../deck-save-button.vue'

const { t } = useI18n()
const { draft } = inject(deckEditorKey)!

// The draft always carries a seeded value; the getter default only satisfies
// `DeckConfig`'s optional key.
const starting_side = computed<CardStartingSide>({
  get: () => draft.study_config.starting_side ?? 'front',
  set: (value) => (draft.study_config.starting_side = value)
})

const starting_side_options = computed(() =>
  (['front', 'back', 'random'] as const).map((value) => ({
    value,
    label: t(`deck.settings-modal.review-pacing.starting-side.${value}`)
  }))
)
</script>

<template>
  <section-list
    data-testid="tab-review-pacing"
    class="px-(--deck-settings-padding) pb-(--deck-settings-padding)"
  >
    <labeled-section :label="t('deck.settings-modal.review-pacing.section.cards-heading')">
      <ui-toggle v-model:checked="draft.study_config.shuffle">
        <div class="flex items-center gap-2.5">
          <ui-icon src="shuffle" class="size-4.5" />
          {{ t('deck.settings-modal.review-pacing.shuffle') }}
        </div>
      </ui-toggle>

      <div
        data-testid="tab-review-pacing__starting-side"
        class="flex items-center justify-between gap-3"
      >
        <div class="flex items-center gap-2.5 text-brown-700 dark:text-brown-100">
          <ui-icon src="card-flip" class="size-4.5" />
          {{ t('deck.settings-modal.review-pacing.starting-side-label') }}
        </div>

        <ui-option-group
          data-testid="tab-review-pacing__starting-side-options"
          v-model:value="starting_side"
          :options="starting_side_options"
        />
      </div>
    </labeled-section>

    <pacing-section class="mt-4" />

    <deck-save-button />
  </section-list>
</template>
