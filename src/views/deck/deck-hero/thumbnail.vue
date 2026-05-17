<script setup lang="ts">
import DeckThumbnail from '@/components/deck/deck-thumbnail.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useI18n } from 'vue-i18n'
import { useDeckSettingsModal } from '@/composables/modals/use-deck-settings-modal'

const { deck } = defineProps<{ deck: Deck }>()

const { t } = useI18n()
const deck_settings_modal = useDeckSettingsModal()

function onSettingsClicked() {
  deck_settings_modal.open(deck)
}
</script>

<template>
  <deck-thumbnail
    size="lg"
    class="relative"
    :deck="deck"
    :click_sfx="'ui.select'"
    @click="onSettingsClicked"
  >
    <template #actions>
      <ui-button
        data-testid="deck-hero__settings-button"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        icon-left="build"
        class="absolute! -top-2.5 -left-2.5"
        icon-only
      >
        {{ t('deck.settings-modal.title') }}
      </ui-button>
    </template>
  </deck-thumbnail>
</template>
