<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

type TextEditorProps = {
  disabled?: boolean
  content?: string
  placeholder?: string
  attributes?: CardAttributes
}

const { disabled, content, attributes } = defineProps<TextEditorProps>()

const emit = defineEmits<{
  (e: 'update', text: string): void
  (e: 'focus'): void
  (e: 'blur'): void
}>()

const text_editor = useTemplateRef<HTMLDivElement>('text-editor')
const has_content = ref(Boolean(content?.trim()))

/** Horizontal alignment lives on the editable (text-align); vertical lives on the filling container (flex justify), so an empty caret stays centered instead of pinned to the top. */
const horizontal_alignment = computed(() => attributes?.horizontal_alignment ?? 'center')
const vertical_alignment = computed(() => attributes?.vertical_alignment ?? 'center')

/** Seeds the editable from `content` once; never re-synced afterward — content in edit mode is only the user's own input echoed back, and re-writing it would snap the caret to the start. */
onMounted(() => {
  if (!text_editor.value) return
  text_editor.value.textContent = content ?? ''
})

function on_input(event: Event) {
  // innerText tacks a trailing newline onto cleared content ("\n" not "") — collapse whitespace-only text to empty.
  const raw = (event.target as HTMLElement).innerText ?? ''
  const text = raw.trim() ? raw : ''
  has_content.value = text.length > 0
  emit('update', text)
}

function focus() {
  text_editor.value?.focus()
}

/** Forwards a click in the surrounding container (the editable is only content-height) to focus the editor and drop the caret at the end; clicks on the editable itself fall through to native placement. */
function onContainerPointerDown(event: PointerEvent) {
  const editor = text_editor.value
  if (disabled || !editor || event.target === editor) return

  editor.focus()

  const selection = window.getSelection()
  if (selection) {
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  armGhostClickGuard()
}

/** Swallows the tap's synthetic mouse events after a focusing gesture, so the browser's scroll-into-view can't re-target them onto whatever now sits under the finger. →[K:text-editor-ghost-click-guard] */
const GHOST_EVENT_WINDOW_MS = 500
const GHOST_EVENT_TYPES = ['mousedown', 'mouseup', 'click'] as const
let ghost_event_timer: ReturnType<typeof setTimeout> | undefined

function armGhostClickGuard() {
  for (const type of GHOST_EVENT_TYPES) {
    document.addEventListener(type, suppressGhostEvent, { capture: true })
  }
  clearTimeout(ghost_event_timer)
  ghost_event_timer = setTimeout(disarmGhostClickGuard, GHOST_EVENT_WINDOW_MS)
}

function suppressGhostEvent(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  if (event.type === 'click') disarmGhostClickGuard()
}

function disarmGhostClickGuard() {
  for (const type of GHOST_EVENT_TYPES) {
    document.removeEventListener(type, suppressGhostEvent, { capture: true })
  }
  clearTimeout(ghost_event_timer)
}

onBeforeUnmount(disarmGhostClickGuard)

defineExpose({ focus })
</script>

<template>
  <div
    data-testid="text-editor-container"
    class="text-editor-container relative"
    :class="`text-editor--v-${vertical_alignment}`"
    @pointerdown="onContainerPointerDown"
  >
    <div
      v-if="disabled"
      data-testid="text-editor"
      contenteditable="false"
      :class="['text-editor', `text-editor--h-${horizontal_alignment}`]"
    >
      {{ content }}
    </div>

    <div
      v-else
      data-testid="text-editor"
      ref="text-editor"
      contenteditable="plaintext-only"
      :class="['text-editor', `text-editor--h-${horizontal_alignment}`]"
      @input="on_input"
      @focus="emit('focus')"
      @blur="emit('blur')"
    ></div>

    <span
      v-if="!has_content && !disabled"
      data-testid="text-editor__placeholder"
      class="text-editor__placeholder"
      :class="[
        `text-editor__placeholder--h-${horizontal_alignment}`,
        `text-editor__placeholder--v-${vertical_alignment}`
      ]"
    >
      {{ placeholder }}
    </span>
  </div>
</template>

<style>
/* Vertically positions the editable, which sizes to its content, so an empty
   editor's caret centers with the text instead of pinning to the top. */
.text-editor-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Whole filling container reads as a text target when editable (clicks
   anywhere focus via onContainerPointerDown), not just the content-height line. */
.text-editor-container:has([contenteditable='plaintext-only']) {
  cursor: text;
}

.text-editor {
  width: 100%;
  outline: none;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.text-editor--h-left {
  text-align: left;
}

.text-editor--h-center {
  text-align: center;
}

.text-editor--h-right {
  text-align: right;
}

.text-editor--v-top {
  justify-content: flex-start;
}

.text-editor--v-center {
  justify-content: center;
}

.text-editor--v-bottom {
  justify-content: flex-end;
}

/* Mirrors the editor's alignment so the hint sits where typed text will land —
   horizontal maps to justify-content + text-align, vertical to align-items. */
.text-editor__placeholder {
  position: absolute;
  inset: 0;
  /* Hosts (card-face, the loading scrim) hide this by setting the var, not by selecting into our internals. */
  display: var(--text-editor-placeholder-display, flex);
  pointer-events: none;
  color: var(--color-brown-300);
  /* Matches the editor so the hint's line box fits a content-height region without clipping. */
  line-height: 1.2;
}

.text-editor__placeholder--h-left {
  justify-content: flex-start;
  text-align: left;
}

.text-editor__placeholder--h-center {
  justify-content: center;
  text-align: center;
}

.text-editor__placeholder--h-right {
  justify-content: flex-end;
  text-align: right;
}

.text-editor__placeholder--v-top {
  align-items: flex-start;
}

.text-editor__placeholder--v-center {
  align-items: center;
}

.text-editor__placeholder--v-bottom {
  align-items: flex-end;
}

.text-editor {
  line-height: 1.2;
}
</style>
