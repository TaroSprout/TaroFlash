<script setup lang="ts">
// imports
import { computed } from 'vue'
import Card from '@/components/card/index.vue'
import CardFaceUploader from '@/components/card/card-face-uploader.vue'
import TextEditor from '@/components/card/text-editor.vue'

// types
type CardSide = 'front' | 'back'

type CardEditFaceProps = {
  card?: Card
  side: CardSide
  card_attributes: DeckCardAttributes
  placeholder: string
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
  input_testid = 'card-edit-face__input',
  with_images = false,
  disabled = false,
  error = false
} = defineProps<CardEditFaceProps>()

const emit = defineEmits<{
  (e: 'update', side: CardSide, text: string): void
}>()

// computed
const text = computed(() => (side === 'front' ? card?.front_text : card?.back_text))
const attributes = computed(() => card_attributes[side])

// The text-editor is uncontrolled, so it only seeds `content` on mount — keying
// it by card + side remounts it whenever either changes (flip, prev/next).
const editor_key = computed(() => `${card?.id}-${side}`)
</script>

<template>
  <card-face-uploader
    v-if="with_images"
    :card="card"
    :side="side"
    :card_attributes="card_attributes"
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
  </card-face-uploader>

  <card v-else size="xl" mode="edit" :side="side" v-bind="card" :card_attributes="card_attributes">
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
