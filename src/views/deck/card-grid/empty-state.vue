<script setup lang="ts">
import CardGridSkeleton from './skeleton.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { computed, inject, onMounted, onUnmounted, ref, useTemplateRef, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMatchMedia } from '@/composables/ui/media-query'
import { type CardGridSize } from '@/composables/deck/view-shell'
import { cardEditorKey } from '@/composables/card/list-controller'

const { t } = useI18n()

const { newCard } = inject(cardEditorKey)!

// Below xl the deck view stacks (hero above the content), so a viewport-fixed
// centered message lands off-screen below the fold. There the message flows
// inline and sizes the container, the skeleton drops behind it as an absolute
// backdrop that bleeds off the edges, and the page scrolls just far enough to
// reach the CTA — not a whole device height.
const is_stacked = useMatchMedia('w<xl')

// On the narrowest screens the md backdrop cards get cramped — drop to base.
const is_compact = useMatchMedia('w<sm')
const skeleton_size = computed<CardGridSize>(() => (is_compact.value ? 'base' : 'md'))

const container = useTemplateRef<HTMLElement>('container')
const bounds = ref({ left: 0, right: 0 })

let resizeObs: ResizeObserver | null = null

const overlay_style = computed(() =>
  is_stacked.value
    ? undefined
    : { left: `${bounds.value.left}px`, right: `${bounds.value.right}px` }
)

onMounted(() => {
  resizeObs = new ResizeObserver(measureBounds)
  if (container.value) resizeObs.observe(container.value)
  window.addEventListener('resize', measureBounds, { passive: true })
  measureBounds()
})

onUnmounted(() => {
  resizeObs?.disconnect()
  window.removeEventListener('resize', measureBounds)
})

function measureBounds() {
  if (!container.value) return

  const rect = container.value.getBoundingClientRect()
  bounds.value = { left: rect.left, right: window.innerWidth - rect.right }
}

// At xl the empty grid intentionally overflows behind the viewport-fixed
// message, so the page must not scroll. When stacked we leave scroll on so the
// inline message and its CTA are reachable.
watchEffect((onCleanup) => {
  if (is_stacked.value) return

  document.documentElement.style.overflow = 'hidden'
  onCleanup(() => (document.documentElement.style.overflow = ''))
})
</script>

<template>
  <div
    ref="container"
    data-testid="card-grid-empty"
    class="relative w-full"
    :class="is_stacked ? 'flex justify-center' : 'h-full'"
  >
    <card-grid-skeleton
      aria-hidden="true"
      :shimmer="false"
      :size="skeleton_size"
      :class="{ 'absolute inset-0': is_stacked }"
    />

    <div
      data-testid="card-grid-empty__overlay"
      class="flex items-center justify-center pointer-events-none"
      :class="is_stacked ? 'relative pt-18 pb-48' : 'fixed top-(--nav-height) bottom-0'"
      :style="overlay_style"
    >
      <div
        data-testid="card-grid-empty__content"
        class="flex flex-col items-center gap-4 pointer-events-auto text-brown-700 dark:text-brown-100"
      >
        <ui-icon src="card-deck" class="w-16 h-16" />

        <p data-testid="card-grid-empty__message" class="text-2xl">
          {{ t('deck-view.empty-state.no-cards') }}
        </p>

        <ui-button
          data-testid="card-grid-empty__create-button"
          data-theme="blue-500"
          data-theme-dark="blue-650"
          icon-left="card-add"
          @click="newCard"
        >
          {{ t('deck-view.empty-state.create-button') }}
        </ui-button>
      </div>
    </div>
  </div>
</template>
