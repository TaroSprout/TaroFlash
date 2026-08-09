<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import Card from '@/components/card/index.vue'
import TextEditor from '@/components/card/text-editor.vue'

type CardSide = 'front' | 'back'

type FaceEditorProps = {
  card?: Card
  side: CardSide
  /** Deck-level attribute bag; hosts editing a bare face (no full card, e.g. the audio-reader field) pass per-face `attributes` instead. */
  card_attributes?: DeckCardAttributes
  attributes?: CardAttributes
  /** Override for hosts whose editor state lives outside the card; falls back to the card's own side text. */
  text?: string
  placeholder: string
  /** Editor remount key. Defaults to the card id; a host cycling through temp cards passes the client_id so a temp→real id promotion mid-typing doesn't drop the caret. */
  card_key?: string | number
  input_testid?: string
  with_images?: boolean
  disabled?: boolean
  error?: boolean
}

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

const card_ref = useTemplateRef('card')
const editor_ref = useTemplateRef('editor')

const face_text = computed(() => text ?? (side === 'front' ? card?.front_text : card?.back_text))
const face_attributes = computed(() => attributes ?? card_attributes?.[side])
const resolved_card_attributes = computed<DeckCardAttributes>(
  () => card_attributes ?? { front: attributes ?? {}, back: attributes ?? {} }
)

/** Remounts the uncontrolled text-editor whenever card or side changes, since it only seeds `content` on mount. */
const editor_key = computed(() => `${card_key ?? card?.id}-${side}`)

/** Card's image-layer controls, for a host (the mobile editor's menu) to drive add/remove for the current face; null when there's no image layer. */
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
