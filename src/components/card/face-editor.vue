<script setup lang="ts">
// imports
import { computed, useTemplateRef } from 'vue'
import Card from '@/components/card/index.vue'
import TextEditor from '@/components/card/text-editor.vue'

// types
type CardSide = 'front' | 'back'

type FaceEditorProps = {
  card?: Card
  side: CardSide
  // Deck-level attribute bag; hosts editing a bare face (no full card, e.g. the
  // audio-reader field) pass per-face `attributes` instead.
  card_attributes?: DeckCardAttributes
  attributes?: CardAttributes
  // Text override for hosts whose editor state lives outside the card; falls
  // back to the card's own side text.
  text?: string
  placeholder: string
  // Stable identity for the editor remount key. Defaults to the card id, but a
  // host cycling through temp cards passes the client_id so a temp→real id
  // promotion mid-typing doesn't remount the editor and drop the caret.
  card_key?: string | number
  input_testid?: string
  with_images?: boolean
  disabled?: boolean
  error?: boolean
}

// defines
const {
  card,
  side,
  card_attributes,
  attributes,
  text,
  placeholder,
  card_key,
  input_testid = 'face-editor__input',
  with_images = false,
  disabled = false,
  error = false
} = defineProps<FaceEditorProps>()

const emit = defineEmits<{
  (e: 'update', side: CardSide, text: string): void
}>()

// composables
const card_ref = useTemplateRef('card')
const editor_ref = useTemplateRef('editor')

// computed
const face_text = computed(() => text ?? (side === 'front' ? card?.front_text : card?.back_text))
const face_attributes = computed(() => attributes ?? card_attributes?.[side])
const resolved_card_attributes = computed<DeckCardAttributes>(
  () => card_attributes ?? { front: attributes ?? {}, back: attributes ?? {} }
)

// The text-editor is uncontrolled, so it only seeds `content` on mount — keying
// it by card + side remounts it whenever either changes (flip, prev/next).
const editor_key = computed(() => `${card_key ?? card?.id}-${side}`)

// Surface the card's image-layer controls so a host (the mobile editor's menu)
// can drive add/remove for the current face. Null when there's no image layer.
defineExpose({
  uploader: computed(() => card_ref.value?.image_controls ?? null),
  focus: () => editor_ref.value?.focus()
})
</script>

<template>
  <card
    ref="card"
    mode="edit"
    :side="side"
    v-bind="card"
    :card_attributes="resolved_card_attributes"
    :image_editing="with_images"
    :disabled="disabled"
    :error="error"
  >
    <template #editor>
      <text-editor
        ref="editor"
        :key="editor_key"
        :data-testid="input_testid"
        :content="face_text"
        :attributes="face_attributes"
        :placeholder="placeholder"
        :disabled="disabled"
        class="h-full w-full"
        @update="emit('update', side, $event)"
      />
    </template>
  </card>
</template>
