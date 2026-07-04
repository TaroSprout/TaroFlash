<script lang="ts">
/** Base shape every grouped-list item builds on — layout only, no interaction/visual state. */
export const GROUPED_LIST_ITEM_CLASS = 'flex items-center gap-3 p-4'
</script>

<script setup lang="ts">
import { useAttrs } from 'vue'

type GroupedListProps = {
  dividers?: boolean
  // Scrolls internally within the rounded chrome background instead of
  // clipping content; pair with a sibling `<scroll-bar>` targeting the
  // `__content` testid below (native scrollbar is suppressed).
  scrollable?: boolean
}

const { dividers = false, scrollable = false } = defineProps<GroupedListProps>()

defineSlots<{
  default(): any
  /** Absolutely positioned over the list; content must opt in with pointer-events-auto. */
  overlay?(): any
}>()

const attrs = useAttrs()
</script>

<template>
  <div
    data-testid="grouped-list"
    data-theme="brown-100"
    data-theme-dark="stone-700"
    class="relative flex flex-col"
  >
    <div
      :data-testid="
        attrs['data-testid'] ? `${attrs['data-testid']}__content` : 'grouped-list__content'
      "
      class="flex min-h-0 flex-1 flex-col rounded-4 bg-(--theme-primary)"
      :class="[
        dividers ? 'divide-y divide-brown-300 dark:divide-stone-600' : '',
        scrollable ? 'overflow-y-auto scroll-hidden' : 'overflow-hidden'
      ]"
    >
      <slot></slot>
    </div>

    <div
      v-if="$slots.overlay"
      data-testid="grouped-list__overlay"
      class="absolute inset-0 pointer-events-none"
    >
      <slot name="overlay"></slot>
    </div>
  </div>
</template>
