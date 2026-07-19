<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { useGestures } from '@/composables/ui/gestures'
import { emitSfx } from '@/sfx/bus'
import type { Bus, SoundKey } from '@/sfx/config'

type SliderProps = {
  min?: number
  max?: number
  step?: number
  label?: string
  ticks?: boolean
  /** Sound played on each notch while dragging; `bus` routes its volume. */
  sfx?: { tick?: SoundKey; bus?: Bus }
}

const MAX_TICKS = 20
const EDGE_PX = 20
const EDGE = `${EDGE_PX}px`

const { min = 0, max = 100, step = 1, label, ticks = true, sfx = {} } = defineProps<SliderProps>()

const value = defineModel<number>({ required: true })

const container = useTemplateRef('container')

const { register } = useGestures()

const is_dragging = ref(false)

let rect_left = 0
let rect_width = 0

const fill_width = computed(() => `calc(${offsetOf(value.value)} + ${EDGE})`)

const tick_values = computed(() => {
  if (!ticks) return []
  const count = (max - min) / step
  if (!Number.isFinite(count) || count < 2 || count > MAX_TICKS) return []
  return Array.from({ length: count - 1 }, (_, i) => min + (i + 1) * step)
})

onMounted(() => {
  register(container.value!, {
    onStart({ x }) {
      const rect = container.value!.getBoundingClientRect()
      rect_left = rect.left
      rect_width = rect.width
      is_dragging.value = true
      applyX(x)
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

function offsetOf(v: number) {
  if (max === min) return EDGE
  const fraction = clamp((v - min) / (max - min), 0, 1)
  return `calc(${EDGE} + ${fraction} * (100% - ${EDGE} * 2))`
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(Math.max(n, lo), hi)
}

function applyX(client_x: number) {
  const ratio = clamp((client_x - rect_left - EDGE_PX) / (rect_width - EDGE_PX * 2), 0, 1)
  const raw = min + ratio * (max - min)
  const stepped = clamp(min + Math.round((raw - min) / step) * step, min, max)

  if (stepped === value.value) return

  value.value = stepped
  emitSfx(sfx.tick ?? 'tap_05', { bus: sfx.bus })
}

function onKeydown(e: KeyboardEvent) {
  const delta = KEY_DELTAS[e.key]
  if (delta === undefined) return

  e.preventDefault()
  const next = e.key === 'Home' ? min : e.key === 'End' ? max : value.value + delta * step
  value.value = clamp(next, min, max)
}

const KEY_DELTAS: Record<string, number> = {
  ArrowRight: 1,
  ArrowUp: 1,
  ArrowLeft: -1,
  ArrowDown: -1,
  Home: 0,
  End: 0
}
</script>

<template>
  <div
    ref="container"
    data-testid="ui-kit-slider"
    role="slider"
    tabindex="0"
    :aria-label="label"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="value"
    :data-active="is_dragging"
    class="relative h-12 w-full select-none overflow-hidden rounded-4 bg-input touch-none outline-none"
    :class="is_dragging ? 'cursor-grabbing' : 'cursor-grab'"
    @keydown="onKeydown"
  >
    <div
      data-testid="ui-kit-slider__fill"
      class="absolute inset-y-0 left-0 rounded-4 bg-(--theme-primary)"
      :style="{ width: fill_width }"
    ></div>

    <div
      data-testid="ui-kit-slider__handle"
      class="absolute inset-y-2.5 w-1 -translate-x-1/2 rounded-full bg-(--theme-on-primary) dark:bg-brown-100"
      :style="{ left: offsetOf(value) }"
    ></div>

    <span
      v-for="tick in tick_values"
      :key="tick"
      aria-hidden="true"
      data-testid="ui-kit-slider__tick"
      :data-visible="tick > value"
      class="absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brown-500 transition-opacity dark:bg-stone-500"
      :class="tick > value ? 'opacity-100' : 'opacity-0'"
      :style="{ left: offsetOf(tick) }"
    ></span>

    <div
      data-testid="ui-kit-slider__content"
      class="pointer-events-none absolute inset-0 flex items-center justify-between px-4 text-brown-700 dark:text-brown-100"
      :style="{ clipPath: `inset(0 0 0 ${fill_width})` }"
    >
      <span
        v-if="label"
        data-testid="ui-kit-slider__label"
        class="flex items-center self-stretch bg-input px-1"
      >
        {{ label }}
      </span>
      <span
        data-testid="ui-kit-slider__value"
        class="flex items-center self-stretch bg-input px-1 tabular-nums"
      >
        {{ value }}
      </span>
    </div>

    <div
      aria-hidden="true"
      data-testid="ui-kit-slider__content-fill"
      class="pointer-events-none absolute inset-0 flex items-center justify-between px-4 text-base text-(--theme-on-primary)"
      :style="{ clipPath: `inset(0 calc(100% - ${fill_width}) 0 0 round 16px)` }"
    >
      <span v-if="label" class="flex items-center self-stretch bg-(--theme-primary)/70 px-1">
        {{ label }}
      </span>
      <span class="flex items-center self-stretch bg-(--theme-primary)/70 px-1 tabular-nums">
        {{ value }}
      </span>
    </div>
  </div>
</template>
