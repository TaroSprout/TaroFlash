<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiToggle from '@/components/ui-kit/toggle.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import CappedSpinboxRow from './capped-spinbox-row.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { deckSettingsLayoutKey } from '../layout'
import { DAILY_LIMIT_BOUNDS } from '@/utils/deck/defaults'
import DeckBackButton from '../deck-back-button.vue'
import DeckSaveButton from '../deck-save-button.vue'

const { t } = useI18n()
const { deck, config } = inject(deckEditorKey)!
const layout_mode = inject(deckSettingsLayoutKey)!

const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <section-list data-testid="tab-study">
    <deck-back-button @back="emit('back')" />
    <labeled-section :label="t('deck.settings-modal.study.section.cards-heading')">
      <ui-toggle v-model:checked="config.shuffle">
        <div class="flex items-center gap-2.5">
          <ui-icon src="reorder" />
          {{ t('deck.settings-modal.study.shuffle') }}
        </div>
      </ui-toggle>

      <ui-toggle v-model:checked="config.flip_cards">
        <div class="flex items-center gap-2.5">
          <ui-icon src="horizontal-align" />
          {{ t('deck.settings-modal.study.flip-cards') }}
        </div>
      </ui-toggle>
    </labeled-section>

    <labeled-section
      :label="t('deck.settings-modal.study.section.limits-heading')"
      :description="t('deck.settings-modal.study.section.limits-description')"
    >
      <capped-spinbox-row
        data-testid="tab-study__max-reviews"
        :label="t('deck.settings-modal.study.max-reviews-per-day')"
        :all_label="t('deck.settings-modal.study.max-reviews.all-toggle')"
        :min="DAILY_LIMIT_BOUNDS.min"
        :max="DAILY_LIMIT_BOUNDS.reviews.max"
        :step="DAILY_LIMIT_BOUNDS.step"
        :default_value="DAILY_LIMIT_BOUNDS.reviews.default"
        :prefill_when_all="deck?.card_count"
        v-model:value="config.max_reviews_per_day"
      />

      <capped-spinbox-row
        data-testid="tab-study__max-new"
        :label="t('deck.settings-modal.study.max-new-per-day')"
        :all_label="t('deck.settings-modal.study.max-new.all-toggle')"
        :min="DAILY_LIMIT_BOUNDS.min"
        :max="DAILY_LIMIT_BOUNDS.new_cards.max"
        :step="DAILY_LIMIT_BOUNDS.step"
        :default_value="DAILY_LIMIT_BOUNDS.new_cards.default"
        :prefill_when_all="deck?.card_count"
        v-model:value="config.max_new_per_day"
      />
    </labeled-section>
    <deck-save-button v-if="layout_mode === 'sheet'" />
  </section-list>
</template>
