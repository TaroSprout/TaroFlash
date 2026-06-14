<script setup lang="ts">
import toolbarBase from './toolbar-base.vue'
import CardCount from './card-count.vue'
import PageSettings from './page-settings.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useI18n } from 'vue-i18n'
import { inject } from 'vue'
import { cardEditorKey } from '@/composables/card/list-controller'
import { deckViewShellKey } from '@/composables/deck/view-shell'
import { emitSfx } from '@/sfx/bus'

const { t } = useI18n()

const { setMode } = inject(deckViewShellKey)!
const { addCardAtTop } = inject(cardEditorKey)!

// Enter edit mode (no-op if already there; setMode plays the mode-switch chime)
// and wait for the slide to settle before adding the card, so its focus +
// scroll-into-view read final positions rather than the mid-animation transform.
// The add chime is `blocking` so it suppresses the `slide_up` that focusing the
// new card would otherwise fire.
async function onNewCard() {
  await setMode('edit')
  emitSfx('ui.snappy_button_2', { blocking: true })
  addCardAtTop()
}
</script>

<template>
  <toolbar-base>
    <template #left>
      <ui-button
        data-testid="mode-view__search-button"
        data-theme="brown-300"
        data-theme-dark="stone-700"
        size="sm"
        icon-left="search"
        icon-only
      >
        {{ t('deck-view.mode-view.search') }}
      </ui-button>

      <page-settings />

      <ui-button
        data-testid="mode-view__add-card-button"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        size="sm"
        icon-left="add"
        @click="onNewCard"
      >
        {{ t('deck-view.mode-view.new-card') }}
      </ui-button>
    </template>

    <template #right>
      <card-count />
    </template>
  </toolbar-base>
</template>
