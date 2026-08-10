<script setup lang="ts">
import SourcePanel from '@/views/deck/card-import/source-panel.vue'
import DestinationNote from '@/views/deck/card-import/destination-note.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardImportKey } from '@/views/deck/composables/card-import'

const { t } = useI18n()

const draft = inject(cardImportKey)!
</script>

<template>
  <div data-testid="deck-hero__import-panel" class="flex w-full flex-col gap-3">
    <source-panel />

    <ui-button
      data-testid="deck-hero__import-button"
      data-palette="brand"
      icon-left="card-place"
      size="lg"
      full-width
      :loading="draft.importing.value"
      :disabled="!draft.has_cards.value || draft.importing.value"
      @press="draft.commit"
    >
      {{ t('deck-view.card-import.import-button', { count: draft.cards.value.length }) }}
    </ui-button>

    <destination-note />
  </div>
</template>
