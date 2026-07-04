<script setup lang="ts">
import { computed } from 'vue'

type TagProps = {
  notchSide?: 'left' | 'right'
  notchDepth?: number
  apexRadius?: number
  // stretch to the height of a flex sibling instead of sizing to its own text
  fillHeight?: boolean
}

const {
  notchSide = 'right',
  notchDepth = 10,
  apexRadius = 2,
  fillHeight = false
} = defineProps<TagProps>()

const mask = computed(() => {
  const d = notchDepth
  const lineLen = Math.sqrt(d * d + 0.25)
  const k = apexRadius
  const ux = (k * d) / lineLen
  const uy = (k * 0.5) / lineLen

  let path: string
  let stripPos: string
  let basePos: string

  if (notchSide === 'right') {
    const apexX = 0
    const ax = apexX + ux
    const ay = 0.5 - uy
    const bx = apexX + ux
    const by = 0.5 + uy
    path = `M0 0 L${d} 0 L${ax} ${ay} Q${apexX} 0.5 ${bx} ${by} L${d} 1 L0 1 Z`
    stripPos = 'right'
    basePos = 'left'
  } else {
    const apexX = d
    const ax = apexX - ux
    const ay = 0.5 - uy
    const bx = apexX - ux
    const by = 0.5 + uy
    path = `M0 0 L${d} 0 L${d} 1 L0 1 L${bx} ${by} Q${apexX} 0.5 ${ax} ${ay} Z`
    stripPos = 'left'
    basePos = 'right'
  }

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none' viewBox='0 0 ${d} 1' width='${d}' height='100%' shape-rendering='geometricPrecision'><path d='${path}' fill='white'/></svg>`
  const stripUrl = `url("data:image/svg+xml;utf8,${svg}")`

  return `linear-gradient(#fff, #fff) ${basePos} / calc(100% - ${d}px) 100% no-repeat, ${stripUrl} ${stripPos} / ${d}px 100% no-repeat`
})
</script>

<template>
  <span
    data-testid="ui-kit-tag"
    class="bg-(--theme-primary) rounded-1 w-max"
    :class="[
      notchSide === 'right' ? 'pl-4 pr-5' : 'pl-5 pr-4',
      fillHeight ? 'h-full flex items-center' : 'py-1'
    ]"
    :style="{ mask, WebkitMask: mask }"
  >
    <p class="text-(--theme-on-primary)">
      <slot></slot>
    </p>
  </span>
</template>
