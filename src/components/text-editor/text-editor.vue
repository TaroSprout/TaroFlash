<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'

type TextEditorProps = {
  disabled?: boolean
  content?: string
  placeholder?: string
  attributes?: CardAttributes
}

const { disabled, content, attributes } = defineProps<TextEditorProps>()

const LEVEL_PX = [16, 20, 24, 30, 36, 44, 52, 60, 70, 84]
const DEFAULT_LEVEL = 4

const emit = defineEmits<{
  (e: 'update', text: string): void
  (e: 'focus'): void
  (e: 'blur'): void
}>()

const text_editor = useTemplateRef<HTMLDivElement>('text-editor')
const has_content = ref(Boolean(content?.length))

const font_size_px = computed(() => {
  const level = attributes?.text_size ?? DEFAULT_LEVEL
  const clamped = Math.min(LEVEL_PX.length, Math.max(1, Math.round(level)))
  return LEVEL_PX[clamped - 1]
})

const editor_style = computed(() => ({ fontSize: `${font_size_px.value}px` }))
const editor_classes = computed(() => [
  'text-editor',
  `text-editor--h-${attributes?.horizontal_alignment ?? 'center'}`,
  `text-editor--v-${attributes?.vertical_alignment ?? 'center'}`
])

// The editable surface is uncontrolled: seed it from `content` once, then let
// the browser own the DOM. We never re-sync from the prop afterwards — `content`
// in edit mode is only the user's own input echoed back, and re-writing it would
// snap the caret to the start. Read-only mode renders `content` via Vue instead.
onMounted(() => {
  if (!text_editor.value) return
  text_editor.value.textContent = content ?? ''
})

function on_input(event: Event) {
  const text = (event.target as HTMLElement).innerText ?? ''
  has_content.value = text.length > 0
  emit('update', text)
}

function focus() {
  text_editor.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div data-testid="text-editor-container" class="relative">
    <div
      v-if="disabled"
      data-testid="text-editor"
      contenteditable="false"
      :style="editor_style"
      :class="editor_classes"
    >
      {{ content }}
    </div>

    <div
      v-else
      data-testid="text-editor"
      ref="text-editor"
      contenteditable="plaintext-only"
      :style="editor_style"
      :class="editor_classes"
      @input="on_input"
      @focus="emit('focus')"
      @blur="emit('blur')"
    ></div>

    <span
      v-if="!has_content && !disabled"
      data-testid="text-editor__placeholder"
      class="text-editor__placeholder"
    >
      {{ placeholder }}
    </span>
  </div>
</template>

<style>
.text-editor,
.text-editor-container {
  width: 100%;
  height: 100%;
  outline: none;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

/* Horizontal alignment */
.text-editor--h-left {
  text-align: left;
}

.text-editor--h-center {
  text-align: center;
}

.text-editor--h-right {
  text-align: right;
}

/* Vertical alignment */
.text-editor--v-top {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.text-editor--v-center {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.text-editor--v-bottom {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.text-editor__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
  color: var(--color-brown-300);
}

.text-editor {
  line-height: 1.2;
}
</style>
