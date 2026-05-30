<script setup lang="ts">
import Card from '@/components/card/index.vue'
import ImageButton from '../image-button.vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/toast'
import { inject, ref, useTemplateRef } from 'vue'
import { type CardListController } from '@/composables/card-editor/card-list-controller'
import textEditor from '@/components/text-editor/text-editor.vue'
import { emitSfx } from '@/sfx/bus'

type ListItemCardProps = {
  card: Card
  duplicate: boolean
}

const { card } = defineProps<ListItemCardProps>()

const { t } = useI18n()
const toast = useToast()
const list_item_card = useTemplateRef('list-item-card')
const front_input = useTemplateRef('front-input')

const focused = ref(false)

// Local editor state is the source of truth while the component is mounted.
// Initialised from the card prop; later cache updates are ignored so
// incoming refetches can't clobber what the user has typed.
const front_text = ref(card.front_text ?? '')
const back_text = ref(card.back_text ?? '')
const save_failed = ref(false)

const { selection, updateCard, setCardImage, deleteCardImage, card_attributes } =
  inject<CardListController>('card-editor')!
const { is_selecting } = selection

async function onUpdate(side: 'front' | 'back', text: string) {
  if (side === 'front') front_text.value = text
  else back_text.value = text

  save_failed.value = false

  try {
    await updateCard(card.id, { [`${side}_text`]: text })
  } catch {
    save_failed.value = true
  }
}

function focusEditor() {
  if (!focused.value) {
    front_input.value?.focus()
  }
}

async function onImageUpload(side: 'front' | 'back', file: File) {
  if (!card.id) return

  try {
    await setCardImage(card.id, side, file)
  } catch {
    toast.error(t('toast.error.card-image-upload-failed'))
  }
}

async function onImageDelete(side: 'front' | 'back') {
  if (!card.id) return

  try {
    await deleteCardImage(card.id, side)
  } catch {
    toast.error(t('toast.error.card-image-delete-failed'))
  }
}

// focusin/focusout bubble from the editors, so relatedTarget tells us whether
// focus moved within this card (front↔back) or crossed its edge — no
// wall-clock wait for activeElement to settle. Gate the sfx on contenteditable
// focus so the image button doesn't trigger it.
function onFocusIn(e: FocusEvent) {
  if (!(e.target as HTMLElement | null)?.isContentEditable) return

  const moved_within = list_item_card.value?.contains(e.relatedTarget as Node | null) ?? false
  emitSfx(moved_within ? 'ui.click_04' : 'ui.slide_up')
  focused.value = true
}

function onFocusOut(e: FocusEvent) {
  focused.value = list_item_card.value?.contains(e.relatedTarget as Node | null) ?? false
}

function hasFocusWithin() {
  return list_item_card.value?.contains(document.activeElement) ?? false
}

defineExpose({ focusEditor, hasFocusWithin })
</script>

<template>
  <div
    ref="list-item-card"
    data-testid="list-item-card"
    class="flex w-full flex-col justify-center gap-6 md:flex-row"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <card
      data-testid="front-input"
      :data-id="card.id"
      side="front"
      size="xl"
      mode="edit"
      v-bind="card"
      :error="save_failed"
      class="group/card"
      :class="{ 'pointer-events-none': is_selecting }"
    >
      <image-button
        v-if="card.id > 0"
        class="absolute! -top-2 -left-2 opacity-0 transition-opacity duration-100 ease-in-out group-hover/card:opacity-100"
        :image="card.front_image_path"
        @image-uploaded="onImageUpload('front', $event)"
        @image-deleted="onImageDelete('front')"
        @click.stop
      />

      <template #editor>
        <text-editor
          ref="front-input"
          :content="front_text"
          :attributes="card_attributes.front"
          :placeholder="t('deck-view.card-editor.list-item.front-placeholder')"
          class="w-full h-full"
          @update="onUpdate('front', $event)"
        />
      </template>
    </card>

    <card
      data-testid="back-input"
      :data-id="card.id"
      side="back"
      size="xl"
      mode="edit"
      v-bind="card"
      :error="save_failed"
      class="group/card"
      :class="{ 'pointer-events-none': is_selecting }"
    >
      <image-button
        v-if="card.id > 0"
        class="absolute! -top-2 -right-2 opacity-0 transition-opacity duration-100 ease-in-out group-hover/card:opacity-100"
        :image="card.back_image_path"
        @image-uploaded="onImageUpload('back', $event)"
        @image-deleted="onImageDelete('back')"
        @click.stop
      />

      <template #editor>
        <text-editor
          ref="back-input"
          :content="back_text"
          :attributes="card_attributes.back"
          :placeholder="t('deck-view.card-editor.list-item.back-placeholder')"
          class="w-full h-full"
          @update="onUpdate('back', $event)"
        />
      </template>
    </card>
  </div>
</template>
