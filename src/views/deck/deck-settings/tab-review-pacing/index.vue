<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiToggle from '@/components/ui-kit/toggle.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import PacingSection from './pacing-section.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { deckSettingsLayoutKey } from '../layout'
import DeckSaveButton from '../deck-save-button.vue'

const { t } = useI18n()
const { draft } = inject(deckEditorKey)!
const layout_mode = inject(deckSettingsLayoutKey)!
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

      <ui-toggle v-model:checked="draft.study_config.flip_cards">
        <div class="flex items-center gap-2.5">
          <ui-icon src="card-flip" class="size-4.5" />
          {{ t('deck.settings-modal.review-pacing.flip-cards') }}
        </div>
      </ui-toggle>
    </labeled-section>

    <pacing-section class="mt-4" />

    <deck-save-button v-if="layout_mode === 'sheet'" />
  </section-list>
</template>
