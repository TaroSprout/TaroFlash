<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import CoverDesigner from '@/components/deck/cover-designer/index.vue'
import CardDesigner from './card-designer/index.vue'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'
import TabBar from '@/components/layout-kit/tab-bar.vue'
import DeckDesignPreview from '@/components/deck/deck-design-preview.vue'
import { deckEditorKey } from '@/composables/deck-editor'
import { useMatchMedia } from '@/composables/use-media-query'

type SideTab = { value: CardSide; label: string }

const { t } = useI18n()
const editor = inject(deckEditorKey)!

// Width-only: the inline preview replaces the width-gated floating preview, so
// a short-but-wide viewport must not show both.
const is_mobile = useMatchMedia('w<md')

const tabs = computed<SideTab[]>(() => [
  { value: 'cover', label: t('deck.settings-modal.design.designer-tabs.cover') },
  { value: 'front', label: t('deck.settings-modal.design.designer-tabs.front') },
  { value: 'back', label: t('deck.settings-modal.design.designer-tabs.back') }
])

const card_side_attributes = computed(() =>
  editor.active_side.value === 'front' ? editor.card_attributes.front : editor.card_attributes.back
)
</script>

<template>
  <div data-testid="tab-design" class="flex flex-col items-center gap-6">
    <div
      v-if="is_mobile"
      data-testid="tab-design__inline-preview"
      class="flex justify-center w-full"
    >
      <deck-design-preview
        :deck_id="editor.settings.id"
        :cover="editor.cover"
        :card_attributes="editor.card_attributes"
        :side="editor.active_side.value"
        @update:side="editor.setActiveSide"
      />
    </div>
    <tab-bar
      :tabs="tabs"
      :active="editor.active_side.value"
      @update:active="editor.setActiveSide"
    />
    <transition :css="false" mode="out-in" @leave="fadeLeave" @enter="fadeEnter">
      <cover-designer
        v-if="editor.active_side.value === 'cover'"
        :key="editor.active_side.value"
        :config="editor.cover"
      />
      <card-designer v-else :key="editor.active_side.value" :attributes="card_side_attributes" />
    </transition>
  </div>
</template>
