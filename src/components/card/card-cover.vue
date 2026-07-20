<script setup lang="ts">
import { computed } from 'vue'
import { coverBindings } from '@/utils/cover'
import UiIcon from '@/components/ui-kit/icon.vue'

const { cover } = defineProps<{
  cover?: DeckCover
}>()

// A cover with no chosen identity renders NEUTRAL chrome (the `element` role),
// not an accent — this is what a loading skeleton or an un-themed deck wants.
// `coverBindings` emits `data-palette` only when a palette is set, so the
// `:not([data-palette])` rules below pick up the neutral case for free.
const bindings = computed(() => coverBindings(cover, { border: false }))
</script>

<template>
  <div
    data-testid="card-cover"
    v-bind="bindings"
    class="card-cover bg-(--color-accent) text-(--color-on-accent) not-[[data-palette]]:bg-element not-[[data-palette]]:text-on-element flex items-center justify-center"
  >
    <div
      v-if="cover?.icon"
      data-testid="card-cover__icon"
      class="card-cover__icon [&>svg]:w-full [&>svg]:h-full text-yellow-500 dark:text-yellow-700"
      style="width: var(--cover-icon-size); height: var(--cover-icon-size)"
    >
      <ui-icon :src="cover.icon" />
    </div>
  </div>
</template>

<style>
.card-cover {
  width: 100%;
  height: 100%;
  border-radius: var(--face-radius);
  box-sizing: border-box;
  border: var(--face-border-width) solid var(--color-accent);
}

/* No palette → neutral cover: the border and icon step off the accent onto the
   `element` chrome roles, matching the neutral fill above. */
.card-cover:not([data-palette]) {
  border-color: var(--color-element);
}
.card-cover:not([data-palette]) .card-cover__icon {
  color: var(--color-on-element);
}

/* Tiny cards shrink the pattern tile via --card-pattern-scale (set by the
   card's container-query chrome variants) so it still reads at ~43px. The
   inline --bgx-size from coverBindings stays the single source of tile size. */
.card-cover.pattern-mask::before {
  -webkit-mask-size: calc(var(--bgx-size) * var(--card-pattern-scale, 1));
  mask-size: calc(var(--bgx-size) * var(--card-pattern-scale, 1));
}
</style>
