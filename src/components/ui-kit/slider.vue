<script setup lang="ts">
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { useGestures } from '@/composables/ui/gestures'

const { theme = 'brown-800' } = defineProps<{
  theme?: Theme
}>()
const percent = defineModel<number>()

const container = useTemplateRef('container')
const fill = useTemplateRef('fill')

const is_dragging = ref(false)

let gap = 0
let thumb: HTMLElement | null
let drag_container_left = 0
let drag_container_width = 0
let drag_thumb_half = 0

const { register } = useGestures()

let resize_observer: ResizeObserver | null = null

onMounted(() => {
  thumb = container.value!.querySelector('[data-testid="ui-kit-slider__thumb"]')

  resize_observer = new ResizeObserver(([entry]) => {
    if (entry.contentRect.width === 0) return
    gap = parseInt(getComputedStyle(container.value!).columnGap) || 0
    if (percent.value !== undefined) setFillWidth(percent.value)
  })
  resize_observer.observe(container.value!)

  register(container.value!, {
    onStart() {
      const rect = container.value!.getBoundingClientRect()
      drag_container_left = rect.left
      drag_container_width = rect.width
      drag_thumb_half = thumb!.clientWidth / 2
      is_dragging.value = true
    },
    onMove({ x }) {
      applyX(x)
    },
    onEnd({ x }) {
      applyX(x)
      is_dragging.value = false
    },
    onCancel() {
      is_dragging.value = false
    }
  })
})

onUnmounted(() => {
  resize_observer?.disconnect()
})

function applyX(clientX: number) {
  const pos = clientX - drag_container_left - drag_thumb_half
  let ratio = pos / (drag_container_width - drag_thumb_half)
  ratio = Math.min(Math.max(ratio, 0), 1)

  const new_percent = ratio * 100
  const rounded = Math.round(new_percent)
  const clamped = Math.min(Math.max(rounded, 0), 100)
  const final = clamped === 0 ? 0 : clamped === 100 ? 100 : new_percent

  percent.value = clamped
  setFillWidth(final)
}

function setFillWidth(new_percent: number) {
  if (!container.value || !fill.value || !thumb) return

  const width = container.value.offsetWidth
  const new_width = width * (new_percent / 100)
  const clamped = Math.min(Math.max(new_width, 0), width - gap)

  fill.value.style.width = `${clamped}px`
}
</script>

<template>
  <div
    ref="container"
    :data-theme="theme"
    data-testid="ui-kit-slider"
    class="grid grid-cols-[auto_1fr] items-center gap-7.5"
  >
    <div
      ref="fill"
      data-testid="ui-kit-slider__fill"
      class="h-2.5 bg-(--theme-primary) rounded-full relative flex items-center"
    >
      <ui-tooltip
        data-testid="ui-kit-slider__thumb"
        :text="`${percent}%`"
        :visible="is_dragging"
        element="div"
        class="absolute -right-6.5 w-5.5 h-5.5 bg-(--theme-accent) rounded-full shrink-0 cursor-pointer hover:ring-4 hover:ring-(--theme-accent) transition-all duration-75 z-10"
      ></ui-tooltip>
    </div>

    <div
      data-testid="ui-kit-slider__track"
      class="h-2.5 bg-brown-100 dark:bg-grey-900 rounded-full"
    ></div>

    <!-- <div data-testid="ui-kit-slider__spinbox">
      <input value="5" class="w-7.5 h-7.5 bg-brown-100 rounded-2.5 px-2.5 py-1" />
    </div> -->
  </div>
</template>
