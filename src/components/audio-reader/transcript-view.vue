<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'
import TranscriptSegment from './transcript-segment.vue'

export type TermSelection = {
  term: string
  sentence: string
  rect: DOMRect
}

const { segments, active_index } = defineProps<{
  segments: TranscriptSegment[]
  active_index: number
}>()

const emit = defineEmits<{
  (e: 'seek', index: number): void
  (e: 'select', selection: TermSelection): void
}>()

const container = useTemplateRef<HTMLElement>('container')

// Keep the active sentence in view as audio plays. `nearest` avoids yanking the
// page when the segment is already visible.
watch(
  () => active_index,
  (index) => {
    const el = container.value?.querySelector(`[data-index="${index}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
)

function segmentIndexOf(node: Node | null): number | null {
  const el = node instanceof Element ? node : node?.parentElement
  const segment = el?.closest('[data-testid="transcript-segment"]')
  const index = segment?.getAttribute('data-index')
  return index === null || index === undefined ? null : Number(index)
}

// A non-empty selection inside the transcript becomes a translate request,
// anchored to the selection's rect. The sentence is the segment the selection
// starts in — context for the translator.
function onMouseUp() {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) return

  const term = selection.toString().trim()
  if (!term) return

  const index = segmentIndexOf(selection.anchorNode)
  if (index === null) return

  const rect = selection.getRangeAt(0).getBoundingClientRect()
  emit('select', { term, sentence: segments[index]?.text ?? term, rect })
}
</script>

<template>
  <div
    ref="container"
    data-testid="transcript-view"
    class="flex flex-wrap gap-x-1 gap-y-2 overflow-y-auto text-2xl leading-relaxed text-brown-700 dark:text-brown-200"
    @mouseup="onMouseUp"
  >
    <transcript-segment
      v-for="(segment, index) in segments"
      :key="index"
      :segment="segment"
      :index="index"
      :active="index === active_index"
      @seek="emit('seek', $event)"
    />
  </div>
</template>
