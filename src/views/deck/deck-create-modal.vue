<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import CoverDesigner from '@/views/deck/cover-designer/index.vue'
import DeckDesignPreview from '@/components/deck/deck-design-preview.vue'
import DeckPinnedPreview from '@/components/deck/pinned-preview.vue'
import { useDeckEditor, deckEditorKey } from '@/composables/deck/editor'
import { useTabModalLayout } from '@/composables/ui/tab-modal-layout'
import { randomCoverConfig } from '@/utils/cover'
import { emitSfx } from '@/sfx/bus'
import { useNoticeStore } from '@/stores/notice-store'
import UiButton from '@/components/ui-kit/button.vue'
import UiInput from '@/components/ui-kit/input.vue'
import UiTextarea from '@/components/ui-kit/textarea.vue'
import MobileSheet from '@/components/layout-kit/sheet/mobile-sheet.vue'

export type DeckCreateResponse = boolean

const { close } = defineProps<{
  close: (response?: DeckCreateResponse) => void
}>()

const { t } = useI18n()
const router = useRouter()
const notice = useNoticeStore()

const editor = useDeckEditor({ cover_config: randomCoverConfig() } as Deck)
provide(deckEditorKey, editor)

const { layout_mode, sheet_px } = useTabModalLayout()

const title_error = ref<string>()

const has_title = computed(() => !!editor.settings.title?.trim())

async function onSave() {
  if (!has_title.value) {
    title_error.value = t('deck.create-modal.title-required')
    emitSfx('etc_woodblock_stuck')
    return
  }

  const saved = await editor.saveDeck()
  if (!saved) {
    notice.error(t('toast.error.deck-save-failed'))
    return
  }
  close(true)
  router.push({ name: 'deck', params: { id: saved.id } })
}

watch(
  () => editor.settings.title,
  () => {
    title_error.value = undefined
  }
)
</script>

<template>
  <mobile-sheet
    data-testid="deck-create-container"
    data-theme="green-500"
    data-theme-dark="green-800"
    class="w-full! max-w-205.5"
    :pattern_config="{ pattern: 'endless-clouds' }"
    :sheet_px="sheet_px"
    @close="close(false)"
  >
    <template #header-content>
      <h1 class="text-5xl text-white w-full" :class="layout_mode !== 'sheet' && 'pt-4'">
        {{ t('deck.create-modal.title') }}
      </h1>
    </template>

    <template #overlay>
      <div
        v-if="layout_mode !== 'sheet'"
        data-testid="deck-create__pinned-preview"
        class="pointer-events-auto absolute right-(--sheet-px) top-6"
      >
        <deck-pinned-preview
          :cover="editor.cover"
          :card_attributes="editor.card_attributes"
          side="cover"
        />
      </div>
    </template>

    <div
      data-testid="deck-create__body"
      :class="[
        'px-(--sheet-px) pb-8 h-full',
        layout_mode === 'sheet' ? 'flex flex-col gap-6' : 'flex gap-14 items-start'
      ]"
    >
      <div data-testid="deck-create__main" class="flex-1 flex flex-col gap-4 w-full min-w-0">
        <deck-design-preview
          v-if="layout_mode === 'sheet'"
          data-testid="deck-create__inline-preview"
          :cover="editor.cover"
          :card_attributes="editor.card_attributes"
          side="cover"
          class="mx-auto"
        />

        <cover-designer :config="editor.cover" />
      </div>

      <aside
        v-if="layout_mode !== 'sheet'"
        data-testid="deck-create__aside"
        class="w-78.5 shrink-0 self-end pt-66 h-full flex flex-col justify-between gap-5 text-brown-700 dark:text-brown-100"
      >
        <div data-testid="deck-create__aside-inputs" class="flex flex-col gap-2">
          <ui-input
            :placeholder="t('deck.title-placeholder')"
            :error="title_error"
            text-align="center"
            size="lg"
            v-model:value="editor.settings.title"
          />
          <ui-textarea
            :placeholder="t('deck.description-placeholder')"
            :max_chars="100"
            rows="3"
            v-model:value="editor.settings.description"
          />
        </div>

        <ui-button
          data-testid="deck-create__aside-submit"
          data-theme="blue-500"
          data-theme-dark="blue-650"
          icon-left="add"
          size="lg"
          full-width
          :disabled="!has_title"
          click-when-disabled
          @press="onSave"
        >
          {{ t('deck.create-modal.submit') }}
        </ui-button>
      </aside>

      <template v-if="layout_mode === 'sheet'">
        <div
          data-testid="deck-create__mobile-inputs"
          class="flex flex-col gap-2 text-brown-700 dark:text-brown-100"
        >
          <ui-input
            :placeholder="t('deck.title-placeholder')"
            :error="title_error"
            text-align="center"
            size="lg"
            v-model:value="editor.settings.title"
          />
          <ui-input
            :placeholder="t('deck.description-placeholder')"
            v-model:value="editor.settings.description"
          />
        </div>

        <div data-testid="deck-create__mobile-actions" class="flex gap-3">
          <ui-button
            data-theme="grey-400"
            icon-left="close"
            size="lg"
            full-width
            @press="close(false)"
          >
            {{ t('deck.create-modal.cancel') }}
          </ui-button>

          <ui-button
            data-theme="blue-500"
            data-theme-dark="blue-650"
            icon-left="add"
            size="lg"
            full-width
            :disabled="!has_title"
            click-when-disabled
            @press="onSave"
          >
            {{ t('deck.create-modal.submit') }}
          </ui-button>
        </div>
      </template>
    </div>
  </mobile-sheet>
</template>
