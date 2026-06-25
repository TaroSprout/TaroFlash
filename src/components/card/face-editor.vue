<script setup lang="ts">
// imports
import { computed } from 'vue'
import Card from '@/components/card/index.vue'
import ImageUploader from '@/components/card/image-uploader.vue'
import TextEditor from '@/components/card/text-editor.vue'

// types
type CardSide = 'front' | 'back'

type FaceEditorProps = {
  card?: Card
  side: CardSide
  card_attributes: DeckCardAttributes
  placeholder: string
  // Stable identity for the editor remount key. Defaults to the card id, but a
  // host cycling through temp cards passes the client_id so a temp→real id
  // promotion mid-typing doesn't remount the editor and drop the caret.
  card_key?: string | number
  size?: CardSize
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
  placeholder,
  card_key,
  size = 'xl',
  input_testid = 'face-editor__input',
  with_images = false,
  disabled = false,
  error = false
} = defineProps<FaceEditorProps>()

const emit = defineEmits<{
  (e: 'update', side: CardSide, text: string): void
}>()

// computed
const text = computed(() => (side === 'front' ? card?.front_text : card?.back_text))
const attributes = computed(() => card_attributes[side])

// The text-editor is uncontrolled, so it only seeds `content` on mount — keying
// it by card + side remounts it whenever either changes (flip, prev/next).
const editor_key = computed(() => `${card_key ?? card?.id}-${side}`)
</script>

<template>
  <image-uploader
    v-if="with_images && card"
    :card="card"
    :side="side"
    :card_attributes="card_attributes"
    :size="size"
    :disabled="disabled"
    :error="error"
  >
    <template #editor>
      <text-editor
        :key="editor_key"
        :data-testid="input_testid"
        :content="text"
        :attributes="attributes"
        :placeholder="placeholder"
        :disabled="disabled"
        class="h-full w-full"
        @update="emit('update', side, $event)"
      />
    </template>
  </image-uploader>

  <card
    v-else
    :size="size"
    mode="edit"
    :side="side"
    v-bind="card"
    :card_attributes="card_attributes"
  >
    <template #editor>
      <text-editor
        :key="editor_key"
        :data-testid="input_testid"
        :content="text"
        :attributes="attributes"
        :placeholder="placeholder"
        class="h-full w-full"
        @update="emit('update', side, $event)"
      />
    </template>
  </card>
</template>
