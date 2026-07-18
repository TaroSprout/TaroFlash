<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiInput from '@/components/ui-kit/input.vue'
import UiTextarea from '@/components/ui-kit/textarea.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { DECK_TITLE_MAX_LENGTH } from '@/utils/deck/defaults'
import { sheetLayoutKey } from '@/components/layout-kit/sheet/sheet-layout'
import DeckSaveButton from '../deck-save-button.vue'

const { t } = useI18n()
const { draft, title_error } = inject(deckEditorKey)!
const layout_mode = inject(sheetLayoutKey)!
</script>

<template>
  <section-list
    data-testid="tab-details"
    class="px-(--deck-settings-padding) pb-(--deck-settings-padding)"
  >
    <div data-testid="tab-details__inputs" class="flex flex-col gap-2">
      <ui-input
        :placeholder="t('deck.title-placeholder')"
        :error="title_error"
        :max-length="DECK_TITLE_MAX_LENGTH"
        text-align="center"
        size="lg"
        v-model:value="draft.title"
      />
      <ui-textarea
        :placeholder="t('deck.description-placeholder')"
        :max_chars="100"
        no-newlines
        rows="3"
        v-model:value="draft.description"
      />
    </div>

    <deck-save-button v-if="layout_mode === 'phone'" />
  </section-list>
</template>
