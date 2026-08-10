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
  <div
    data-testid="deck-footer-import"
    class="flex w-full flex-col px-(--dock-px) pt-(--dock-pt) pb-(--dock-pb)"
  >
    <div
      v-if="draft.is_expanded.value"
      data-testid="deck-footer-import__controls"
      class="flex w-full flex-col gap-3 pb-3"
    >
      <source-panel />

      <destination-note />
    </div>

    <div data-testid="deck-footer-import__bar" class="flex w-full items-center gap-2">
      <ui-button
        neutral
        variant="ghost"
        data-testid="deck-footer-import__close"
        icon-only
        icon-left="close"
        size="lg"
        @press="draft.dismiss"
      >
        {{ t('deck-view.card-import.close') }}
      </ui-button>

      <ui-button
        data-testid="deck-footer-import__button"
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

      <ui-button
        neutral
        variant="ghost"
        data-testid="deck-footer-import__expand"
        icon-only
        icon-left="carat-down"
        size="lg"
        class="**:[.btn-icon]:transition-transform"
        :class="draft.is_expanded.value ? undefined : '**:[.btn-icon]:rotate-180'"
        @press="draft.toggleExpanded"
      >
        {{ t('deck-view.card-import.expand') }}
      </ui-button>
    </div>
  </div>
</template>
