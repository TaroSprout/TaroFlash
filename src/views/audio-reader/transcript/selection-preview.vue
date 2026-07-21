<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import gsap from 'gsap'
import { popInPreview, popOutPreview } from '@/utils/animations/selection-preview'

type SelectionPreview = { text: string; x: number; top: number; bottom: number }

// Gap between the selected line and the bubble, the line top below which the bubble
// flips under the line (so selecting the top line doesn't push it off-screen), and
// the margin it keeps from the viewport edges before it drifts off-centre.
const LINE_GAP = 22
const FLIP_BELOW_Y = 112
const EDGE_MARGIN = 8

const { preview } = defineProps<{
  preview: SelectionPreview | null
}>()

const bubble = useTemplateRef<HTMLElement>('bubble')

// What the bubble renders. Tracks `preview` live while a selection is active and is
// retained through the fade-out (so the bubble keeps its text + position as it
// animates away), then cleared once hidden. The element itself stays mounted — only
// its opacity animates — so re-arming always shows it, with no enter/leave race.
const shown = ref<SelectionPreview | null>(null)
const bubble_width = ref(0)
const viewport_width = ref(0)
let resize_observer: ResizeObserver | null = null

const below = computed(() => !!shown.value && shown.value.top < FLIP_BELOW_Y)

// Centre on the finger, then clamp so the bubble never crosses the edge margins:
// near an edge it drifts off-centre instead of overflowing.
const left = computed(() => {
  if (!shown.value) return 0

  const max_left = Math.max(EDGE_MARGIN, viewport_width.value - bubble_width.value - EDGE_MARGIN)
  return Math.min(Math.max(shown.value.x - bubble_width.value / 2, EDGE_MARGIN), max_left)
})

// Move the bubble with the `translate` property so `transform` stays free for the
// pop-in scale. Above the line, a `calc(... - 100%)` rests its base a gap over the
// line top without measuring its own height; below, its top sits a gap under the
// line bottom.
const bubble_style = computed(() => {
  if (!shown.value) return undefined

  const y = below.value
    ? `${shown.value.bottom + LINE_GAP}px`
    : `calc(${shown.value.top - LINE_GAP}px - 100%)`
  return { translate: `${left.value}px ${y}` }
})

function measure() {
  bubble_width.value = bubble.value?.offsetWidth ?? 0
  viewport_width.value = window.innerWidth
}

onMounted(() => {
  if (!bubble.value) return

  gsap.set(bubble.value, { opacity: 0 })
  resize_observer = new ResizeObserver(measure)
  resize_observer.observe(bubble.value)
})

onBeforeUnmount(() => resize_observer?.disconnect())

// Drive the bubble straight off the prop: appearing pops it in, dragging just keeps
// `shown` in step, and clearing fades it out before dropping the retained preview.
watch(
  () => preview,
  (next, prev) => {
    if (next) {
      shown.value = next
      if (!prev && bubble.value) {
        measure()
        popInPreview(bubble.value)
      }
      return
    }

    if (prev && bubble.value) popOutPreview(bubble.value, () => (shown.value = null))
  }
)
</script>

<template>
  <teleport to="body">
    <div
      ref="bubble"
      data-testid="selection-preview"
      :data-below="below"
      :data-visible="!!shown"
      aria-hidden="true"
      data-depth="overlay"
      class="pointer-events-none fixed left-0 top-0 max-w-[calc(100vw-1rem)] rounded-4 bg-surface px-4 py-2 text-center text-2xl text-ink"
      :style="bubble_style"
    >
      {{ shown?.text }}
    </div>
  </teleport>
</template>
