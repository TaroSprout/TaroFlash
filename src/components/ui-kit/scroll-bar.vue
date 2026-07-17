<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'

type UiScrollBarProps = {
  target?: string | HTMLElement
  // Viewport width above which the bar can show on a fine pointer. Page-level
  // scroll-bars stay 'md' (avoid a custom bar on a narrow desktop window);
  // container-local ones can drop to 'sm' to match their own mobile breakpoint.
  minWidth?: 'sm' | 'md'
}

const { target, minWidth = 'md' } = defineProps<UiScrollBarProps>()

const visibilityClass = computed(() =>
  minWidth === 'sm' ? 'hidden pointer-fine:block' : 'hidden pointer-fine:md:block'
)

const thumbEl = shallowRef<HTMLElement | null>(null)

const visible = ref(false)
const thumbHeight = ref(0)
const thumbOffset = ref(0)
const trackHeight = ref(0)
const dragging = ref(false)

let scrollTarget: HTMLElement | null = null
let resizeObs: ResizeObserver | null = null
let mutObs: MutationObserver | null = null
let animationFrame: number | null = null
let dragStartY = 0
let dragStartOffset = 0

const MIN_THUMB_PX = 24

const thumbStyle = computed(() => ({
  height: `${thumbHeight.value}px`,
  transform: `translatey(${thumbOffset.value}px)`
}))

onMounted(attach)
onUnmounted(detach)

/** SETUP */
function attach() {
  scrollTarget = resolveTarget(target)

  if (!scrollTarget || isPageTarget(scrollTarget)) {
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate, { passive: true })

    mutObs = new MutationObserver(() => scheduleUpdate())
    mutObs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: false
    })
  } else {
    scrollTarget.addEventListener('scroll', scheduleUpdate, { passive: true })

    resizeObs = new ResizeObserver(() => scheduleUpdate())
    resizeObs.observe(scrollTarget)
  }

  scheduleUpdate()
}

function detach() {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  animationFrame = 0

  if (!scrollTarget || isPageTarget(scrollTarget)) {
    window.removeEventListener('scroll', scheduleUpdate)
    window.removeEventListener('resize', scheduleUpdate)
  } else {
    scrollTarget.removeEventListener('scroll', scheduleUpdate)
  }

  resizeObs?.disconnect()
  resizeObs = null

  mutObs?.disconnect()
  mutObs = null

  scrollTarget = null
}

/** SCROLLBAR LOGIC */
function scheduleUpdate() {
  if (animationFrame) return

  animationFrame = requestAnimationFrame(() => {
    animationFrame = null
    update()
  })
}

function update() {
  if (!scrollTarget) {
    visible.value = false
    return
  }

  const clientH = scrollTarget.clientHeight
  const scrollH = scrollTarget.scrollHeight
  const scrollTop = scrollTarget.scrollTop

  const hasOverflow = scrollH > clientH + 1
  visible.value = hasOverflow

  if (!hasOverflow) {
    thumbHeight.value = 0
    thumbOffset.value = 0
    return
  }

  const trackEl = thumbEl.value?.parentElement
  const trackH = trackEl?.clientHeight ?? 0
  trackHeight.value = trackH

  const ratio = clientH / scrollH
  const rawThumb = Math.floor(trackH * ratio)
  const tH = Math.max(MIN_THUMB_PX, Math.min(trackH, rawThumb))
  thumbHeight.value = tH

  const maxScroll = scrollH - clientH
  const maxThumbTravel = trackH - tH
  thumbOffset.value = maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTravel : 0
}

function setScrollFromThumb(offsetPx: number) {
  if (!scrollTarget) return

  const clientH = scrollTarget.clientHeight
  const scrollH = scrollTarget.scrollHeight

  const maxScroll = scrollH - clientH
  const maxThumbTravel = trackHeight.value - thumbHeight.value
  const clamped = Math.max(0, Math.min(maxThumbTravel, offsetPx))

  scrollTarget.scrollTop = maxThumbTravel > 0 ? (clamped / maxThumbTravel) * maxScroll : 0
}

/** EVENT HANDLERS */
function onThumbPointerDown(e: PointerEvent) {
  dragging.value = true
  dragStartY = e.clientY
  dragStartOffset = thumbOffset.value
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  window.addEventListener('pointermove', onThumbPointerMove, { passive: false })
  window.addEventListener('pointerup', onThumbPointerUp)
}

function onThumbPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  e.preventDefault()
  setScrollFromThumb(dragStartOffset + (e.clientY - dragStartY))
  scheduleUpdate()
}

function onThumbPointerUp() {
  dragging.value = false
  window.removeEventListener('pointermove', onThumbPointerMove)
  window.removeEventListener('pointerup', onThumbPointerUp)
}

function onTrackPointerDown(e: PointerEvent) {
  if ((e.target as HTMLElement) === thumbEl.value) return

  const trackEl = thumbEl.value?.parentElement
  if (!trackEl) return

  const rect = trackEl.getBoundingClientRect()
  setScrollFromThumb(e.clientY - rect.top - thumbHeight.value / 2)
  scheduleUpdate()
}

/** HELPER FUNCTIONS */
function resolveTarget(target?: string | HTMLElement): HTMLElement | null {
  if (!target) return null
  if (typeof target !== 'string') return target
  if (target === 'body') return document.body
  if (target === 'html') return document.documentElement
  return document.querySelector(target) as HTMLElement | null
}

function isPageTarget(el: HTMLElement) {
  return el === document.documentElement || el === document.body
}
</script>

<template>
  <div
    v-show="visible"
    ref="scrollBarRef"
    data-testid="ui-kit-scroll-bar"
    data-theme="brown-300"
    data-theme-dark="grey-500"
    :data-min-width="minWidth"
    class="ui-kit-scroll-bar"
    :class="visibilityClass"
    @pointerdown.prevent="onTrackPointerDown"
  >
    <div
      ref="thumbEl"
      data-testid="ui-kit-scroll-bar__thumb"
      class="ui-kit-scroll-bar__thumb hover:bgx-diagonal-stripes"
      :style="thumbStyle"
      @pointerdown.stop.prevent="onThumbPointerDown"
    />
  </div>
</template>

<style scoped>
.ui-kit-scroll-bar {
  --bar-color: var(--theme-primary);
  --thumb-color: var(--theme-primary);
  --theme-color: var(--color-purple-400);

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
  --bar-color: var(--theme-color);
  --thumb-color: var(--theme-color);
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
