<script lang="ts">
/** Base shape every grouped-list item builds on — layout only, no interaction/visual state. */
export const GROUPED_LIST_ITEM_CLASS = 'flex items-center gap-3 p-4'
</script>

<script setup lang="ts">
type GroupedListProps = {
  dividers?: boolean
}

const { dividers = false } = defineProps<GroupedListProps>()

defineSlots<{
  default(): any
  /** Absolutely positioned over the list; content must opt in with pointer-events-auto. */
  overlay?(): any
}>()
</script>

<template>
  <div
    data-testid="grouped-list"
    class="relative flex flex-col rounded-4 bg-brown-100 dark:bg-stone-700 overflow-hidden"
    :class="dividers ? 'divide-y divide-brown-300 dark:divide-stone-600' : ''"
  >
    <slot></slot>

    <div
      v-if="$slots.overlay"
      data-testid="grouped-list__overlay"
      class="absolute inset-0 pointer-events-none"
    >
      <slot name="overlay"></slot>
    </div>
  </div>
</template>
