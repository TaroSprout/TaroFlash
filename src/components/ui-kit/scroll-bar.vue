<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { TYPE_SFX } from '@/sfx/config'

type UiScrollBarProps = {
  /** Reading position — 0 at the top of the content, 1 at the bottom. */
  progress: number
  /** Share of the content on screen, 0 to 1; the thumb takes that much of the track. */
  visible_fraction: number
}

const { progress, visible_fraction } = defineProps<UiScrollBarProps>()

const emit = defineEmits<{
  drag: [progress: number]
  jump: [progress: number]
}>()

const MIN_THUMB_PX = 24

const track_el = useTemplateRef<HTMLElement>('track')
const thumb_el = useTemplateRef<HTMLElement>('thumb')

const track_height = ref(0)
const dragging = ref(false)

let track_obs: ResizeObserver | null = null
let drag_pointer_id = 0
let drag_start_y = 0
let drag_start_offset = 0
let frame = 0

const thumb_height = computed(() => {
  const raw = Math.floor(track_height.value * visible_fraction)
  return Math.min(track_height.value, Math.max(MIN_THUMB_PX, raw))
})

const travel = computed(() => Math.max(track_height.value - thumb_height.value, 0))

const thumb_style = computed(() => ({
  height: `${thumb_height.value}px`,
  transform: `translateY(${clamp(progress, 0, 1) * travel.value}px)`
}))

onMounted(() => {
  // The track is measured by observer rather than on mount because a bar inside
  // a hidden panel reports a height of 0 until the panel is revealed. →[K:scroll-region-hidden-host-measures-zero]
  track_obs = new ResizeObserver(() => (track_height.value = track_el.value?.clientHeight ?? 0))
  if (track_el.value) track_obs.observe(track_el.value)
})

onBeforeUnmount(() => {
  endDrag()

  track_obs?.disconnect()
  track_obs = null
})

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function onThumbPointerDown(e: PointerEvent) {
  const thumb = e.currentTarget as HTMLElement

  dragging.value = true
  drag_pointer_id = e.pointerId
  drag_start_y = e.clientY
  drag_start_offset = clamp(progress, 0, 1) * travel.value

  // Capturing on the thumb keeps the move and release events coming even once
  // the pointer leaves the window, so a drag that ends out there still stops.
  thumb.setPointerCapture(e.pointerId)
  thumb.addEventListener('pointermove', onThumbPointerMove)
  thumb.addEventListener('pointerup', endDrag)
  thumb.addEventListener('pointercancel', endDrag)
}

function onThumbPointerMove(e: PointerEvent) {
  if (!dragging.value || frame) return

  const pointer_y = e.clientY

  frame = requestAnimationFrame(() => {
    frame = 0
    if (travel.value <= 0) return

    const offset = clamp(drag_start_offset + (pointer_y - drag_start_y), 0, travel.value)
    emit('drag', offset / travel.value)
  })
}

function endDrag() {
  cancelAnimationFrame(frame)
  frame = 0

  if (!dragging.value) return
  dragging.value = false

  const thumb = thumb_el.value
  if (!thumb) return

  if (thumb.hasPointerCapture(drag_pointer_id)) thumb.releasePointerCapture(drag_pointer_id)

  thumb.removeEventListener('pointermove', onThumbPointerMove)
  thumb.removeEventListener('pointerup', endDrag)
  thumb.removeEventListener('pointercancel', endDrag)
}

function onTrackPointerDown(e: PointerEvent) {
  const track = track_el.value
  if (!track || travel.value <= 0) return

  const rect = track.getBoundingClientRect()
  const offset = clamp(e.clientY - rect.top - thumb_height.value / 2, 0, travel.value)

  emit('jump', offset / travel.value)
}
</script>

<template>
  <div
    ref="track"
    data-testid="ui-kit-scroll-bar"
    class="ui-kit-scroll-bar pointer-fine:block hidden"
    @pointerdown.prevent="onTrackPointerDown"
  >
    <div
      ref="thumb"
      v-sfx="{ hover: TYPE_SFX }"
      data-testid="ui-kit-scroll-bar__thumb"
      :data-active="dragging"
      class="ui-kit-scroll-bar__thumb hover:bgx-diagonal-stripes"
      :style="thumb_style"
      @pointerdown.stop.prevent="onThumbPointerDown"
    />
  </div>
</template>

<style scoped>
.ui-kit-scroll-bar {
  --bar-color: var(--color-raised);
  --thumb-color: var(--color-raised);
  --thumb-hover-color: var(--color-accent);

  --transition-dur: 0.05s;
  --transition: background-color 0.05s ease-in-out, outline 0.05s ease-in-out;

  width: 4px;

  user-select: none;
  touch-action: none;

  border-radius: 999px;
  background-color: var(--bar-color);
  transition: var(--transition);
}

.ui-kit-scroll-bar:has(.ui-kit-scroll-bar__thumb:hover) {
  --bar-color: var(--thumb-hover-color);
  --thumb-color: var(--thumb-hover-color);
}

.ui-kit-scroll-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;

  transform: translateX(-50%);

  width: 12px;
  height: 12px;

  border-radius: 999px;
  background-color: var(--bar-color);
}
.ui-kit-scroll-bar::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;

  transform: translateX(-50%);

  width: 12px;
  height: 12px;

  border-radius: 999px;
  background-color: var(--bar-color);
}

.ui-kit-scroll-bar__thumb {
  position: absolute;
  left: -4px;
  right: -4px;
  border-radius: 999px;
  background-color: var(--thumb-color);
  cursor: pointer;

  z-index: 10;

  transition: var(--transition);
}
.ui-kit-scroll-bar__thumb:hover {
  outline: 4px solid var(--bar-color);
}
</style>
