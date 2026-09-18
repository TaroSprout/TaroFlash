<script setup lang="ts">
import FaceEditor from '@/components/card/face-editor.vue'

type CardFaceFieldProps = {
  side: 'front' | 'back'
  text: string
  attributes?: CardAttributes
  placeholder: string
  error?: boolean
}

const { side, text, attributes, placeholder, error = false } = defineProps<CardFaceFieldProps>()

const emit = defineEmits<{
  (e: 'update:text', value: string): void
}>()
</script>

<template>
  <face-editor
    data-testid="card-face-field"
    :side="side"
    :text="text"
    :attributes="attributes"
    :placeholder="placeholder"
    :error="error"
    @update="(_side, value) => emit('update:text', value)"
  />
</template>
