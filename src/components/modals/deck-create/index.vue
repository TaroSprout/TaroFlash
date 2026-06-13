<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import DeckDesignPreview from '@/components/deck/deck-design-preview.vue'
import CoverDesigner from '@/components/deck/cover-designer/index.vue'
import { useDeckEditor, deckEditorKey } from '@/composables/deck-editor'
import { useMatchMedia } from '@/composables/use-media-query'
import { randomCoverConfig } from '@/utils/cover'
import { emitSfx } from '@/sfx/bus'
import UiButton from '@/components/ui-kit/button.vue'
import UiInput from '@/components/ui-kit/input.vue'
import UiTextarea from '@/components/ui-kit/textarea.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import Card from '@/components/card/index.vue'
import MobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'

export type DeckCreateResponse = boolean

const { close } = defineProps<{
  close: (response?: DeckCreateResponse) => void
}>()

const { t } = useI18n()
const router = useRouter()

const editor = useDeckEditor({ cover_config: randomCoverConfig() } as Deck)
provide(deckEditorKey, editor)

const is_mobile = useMatchMedia('w<md')

const title_error = ref<string>()

const has_title = computed(() => !!editor.settings.title?.trim())

const sheet_px = computed(() => (is_mobile.value ? '2rem' : '4.5rem'))

async function onSave() {
  if (!has_title.value) {
    title_error.value = t('deck.create-modal.title-required')
    emitSfx('ui.etc_woodblock_stuck')
    return
  }

  const saved = await editor.saveDeck()
  if (!saved) return
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
      <h1 class="text-5xl text-white w-full">{{ t('deck.create-modal.title') }}</h1>
    </template>

    <template #overlay>
      <div
        v-if="!is_mobile"
        data-testid="deck-create__floating-preview"
        class="pointer-events-auto absolute right-(--sheet-px) top-6"
      >
        <div class="relative">
          <card
            size="xl"
            class="absolute! -top-2 right-1"
            face_classes="bg-white! dark:bg-stone-700!"
          />

          <div
            data-testid="deck-create__preview-paperclip"
            class="absolute -top-8 right-15 -translate-x-1/2 z-10 drop-shadow-2xs"
          >
            <ui-icon src="paperclip" class="w-16 h-16 -rotate-186 text-grey-300" />
          </div>

          <deck-design-preview
            :cover="editor.cover"
            :card_attributes="editor.card_attributes"
            side="cover"
            class="rotate-4 drop-shadow-sm"
          />
        </div>
      </div>
    </template>

    <div
      data-testid="deck-create__body"
      :class="[
        'px-(--sheet-px) pb-8 h-full',
        is_mobile ? 'flex flex-col gap-6' : 'flex gap-14 items-start'
      ]"
    >
      <div data-testid="deck-create__main" class="flex-1 flex flex-col gap-4 w-full min-w-0">
        <deck-design-preview
          v-if="is_mobile"
          data-testid="deck-create__inline-preview"
          :cover="editor.cover"
          :card_attributes="editor.card_attributes"
          side="cover"
          class="mx-auto"
        />

        <cover-designer :config="editor.cover" />
      </div>

      <aside
        v-if="!is_mobile"
        data-testid="deck-create__aside"
        class="w-78.5 shrink-0 self-end pt-70 h-full flex flex-col justify-between gap-5 text-brown-700 dark:text-brown-100"
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
          @click="onSave"
        >
          {{ t('deck.create-modal.submit') }}
        </ui-button>
      </aside>

      <template v-if="is_mobile">
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
            @click="close(false)"
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
            @click="onSave"
          >
            {{ t('deck.create-modal.submit') }}
          </ui-button>
        </div>
      </template>
    </div>
  </mobile-sheet>
</template>
