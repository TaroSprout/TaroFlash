<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiInput from '@/components/ui-kit/input.vue'
import UiTextarea from '@/components/ui-kit/textarea.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { deckSettingsLayoutKey } from '../layout'
import DeckBackButton from '../deck-back-button.vue'
import DeckSaveButton from '../deck-save-button.vue'

const { t } = useI18n()
const { settings } = inject(deckEditorKey)!
const layout_mode = inject(deckSettingsLayoutKey)!

const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <section-list
    data-testid="tab-details"
    class="px-(--deck-settings-padding) pb-(--deck-settings-padding)"
  >
    <deck-back-button @back="emit('back')" />

    <div data-testid="tab-details__inputs" class="flex flex-col gap-2">
      <ui-input
        :placeholder="t('deck.title-placeholder')"
        text-align="center"
        size="lg"
        v-model:value="settings.title"
      />
      <ui-textarea
        :placeholder="t('deck.description-placeholder')"
        :max_chars="100"
        rows="3"
        v-model:value="settings.description"
      />
    </div>

    <deck-save-button v-if="layout_mode === 'sheet'" />
  </section-list>
</template>
