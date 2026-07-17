<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import CoverDesigner from '@/views/deck/cover-designer/index.vue'
import CardDesigner from './card-designer/index.vue'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'
import TabBar from '@/components/layout-kit/tab-bar.vue'
import DeckDesignPreview from '@/components/deck/deck-design-preview.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { deckSettingsLayoutKey } from '../layout'
import DeckSaveButton from '../deck-save-button.vue'

type SideTab = { value: CardSide; label: string }

const { t } = useI18n()
const editor = inject(deckEditorKey)!
const layout_mode = inject(deckSettingsLayoutKey)!

const tabs = computed<SideTab[]>(() => [
  { value: 'cover', label: t('deck.settings-modal.design.designer-tabs.cover') },
  { value: 'front', label: t('deck.settings-modal.design.designer-tabs.front') },
  { value: 'back', label: t('deck.settings-modal.design.designer-tabs.back') }
])

const card_side_attributes = computed(() =>
  editor.active_side.value === 'front'
    ? editor.draft.card_attributes.front
    : editor.draft.card_attributes.back
)
</script>

<template>
  <div
    data-testid="tab-design"
    class="flex flex-col items-center gap-6 px-(--deck-settings-padding) pb-(--deck-settings-padding)"
  >
    <div
      v-if="layout_mode === 'sheet'"
      data-testid="tab-design__inline-preview"
      class="flex justify-center w-full"
    >
      <deck-design-preview
        :cover="editor.draft.cover_config"
        :card_attributes="editor.draft.card_attributes"
        :side="editor.active_side.value"
        :front_text="editor.preview_front_text.value"
        :back_text="editor.preview_back_text.value"
        @update:side="editor.setActiveSide"
      />
    </div>
    <tab-bar
      :tabs="tabs"
      :active="editor.active_side.value"
      :full_width="layout_mode !== 'desktop'"
      :size="layout_mode !== 'desktop' ? 'base' : 'sm'"
      @update:active="editor.setActiveSide"
    />
    <transition :css="false" mode="out-in" @leave="fadeLeave" @enter="fadeEnter">
      <cover-designer
        v-if="editor.active_side.value === 'cover'"
        key="cover"
        :config="editor.draft.cover_config"
      />
      <card-designer v-else :key="editor.active_side.value" :attributes="card_side_attributes" />
    </transition>
    <deck-save-button v-if="layout_mode === 'sheet'" />
  </div>
</template>
