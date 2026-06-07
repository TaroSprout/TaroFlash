<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/components/card/index.vue'
import textEditor from '@/components/text-editor/text-editor.vue'

type CardFaceFieldProps = {
  side: 'front' | 'back'
  text: string
  attributes?: CardAttributes
  placeholder: string
  size?: '2xl' | 'xl' | 'lg' | 'base'
  error?: boolean
}

const {
  side,
  text,
  attributes,
  placeholder,
  size = 'xl',
  error = false
} = defineProps<CardFaceFieldProps>()

const emit = defineEmits<{
  (e: 'update:text', value: string): void
}>()

// The real Card keys its face off `card_attributes[side]`; only the rendered
// side matters, so mirror the same attributes onto both slots.
const card_attributes = computed<DeckCardAttributes>(() => ({
  front: attributes ?? {},
  back: attributes ?? {}
}))
</script>

<template>
  <card
    data-testid="card-face-field"
    mode="edit"
    :size="size"
    :side="side"
    :card_attributes="card_attributes"
    :error="error"
  >
    <template #editor>
      <text-editor
        :content="text"
        :attributes="attributes"
        :placeholder="placeholder"
        class="h-full w-full"
        @update="emit('update:text', $event)"
      />
    </template>
  </card>
</template>
