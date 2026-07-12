<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DeckThumbnail from '@/components/deck/deck-thumbnail.vue'
import UiButton from '@/components/ui-kit/button.vue'

type DeckGridItemProps = {
  deck: Deck
  size: 'sm' | 'base'
}

const { deck, size } = defineProps<DeckGridItemProps>()

const emit = defineEmits<{
  press: []
  settings: []
}>()

const { t } = useI18n()
</script>

<template>
  <DeckThumbnail
    :deck="deck"
    :size="size"
    :sfx="{ press: 'snappy_button_5' }"
    @press="emit('press')"
  >
    <template #corner-action>
      <ui-button
        data-testid="dashboard__deck-settings-button"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        icon-left="build"
        icon-only
        @click.stop
        @press="emit('settings')"
        class="ring-4 ring-brown-100 dark:ring-grey-900"
      >
        {{ t('deck.settings-modal.title') }}
      </ui-button>
    </template>
  </DeckThumbnail>
</template>
