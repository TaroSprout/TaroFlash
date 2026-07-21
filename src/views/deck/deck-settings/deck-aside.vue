<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiInput from '@/components/ui-kit/input.vue'
import UiTextarea from '@/components/ui-kit/textarea.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { DECK_TITLE_MAX_LENGTH } from '@/utils/deck/defaults'
import DeckSaveButton from './deck-save-button.vue'

const { t } = useI18n()
const { draft, title_error } = inject(deckEditorKey)!
</script>

<template>
  <aside data-testid="deck-aside" class="h-full flex flex-col justify-between gap-5 text-ink">
    <div data-testid="deck-aside__inputs" class="flex flex-col gap-2">
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

    <deck-save-button />
  </aside>
</template>
