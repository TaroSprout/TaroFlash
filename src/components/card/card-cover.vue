<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { SKELETON_COVER, coverBindings } from '@/utils/cover'
import { useImageReveal } from '@/composables/card/image-reveal'
import UiIcon from '@/components/ui-kit/icon.vue'

const { cover } = defineProps<{
  cover?: DeckCover
}>()

const img_el = useTemplateRef<HTMLImageElement>('img')
// image_path (public URL or staged objectURL) makes a custom image fill the
// cover; palette/pattern/icon stay configured but never render behind it.
const has_image = computed(() => !!cover?.image_path)
const { decoded } = useImageReveal(() => cover?.image_path, img_el)

// While decoding, show the shared SKELETON_COVER so loading matches the app
// skeleton; once decoded, drop chrome (null) for the full-bleed image.
const bindings = computed(() => {
  if (decoded.value) return null
  return coverBindings(has_image.value ? SKELETON_COVER : cover, { border: false })
})
</script>

<template>
  <div
    data-testid="card-cover"
    v-bind="bindings"
    class="card-cover flex items-center justify-center"
    :class="[
      decoded
        ? 'card-cover--image'
        : 'bg-(--color-accent) text-(--color-on-accent) not-[[data-palette]]:bg-element not-[[data-palette]]:text-on-element',
      has_image && !decoded && 'shimmer'
    ]"
    :data-loading="(has_image && !decoded) || undefined"
  >
    <img
      v-if="has_image"
      ref="img"
      data-testid="card-cover__image"
      :src="cover!.image_path"
      class="card-cover__image absolute inset-0 h-full w-full object-cover"
      :class="decoded ? 'opacity-100' : 'opacity-0'"
    />

    <div
      v-else-if="cover?.icon"
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
  position: relative;
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

/* A DECODED image cover has no chrome band — the picture goes edge-to-edge,
   clipped to the face radius. Applied only once decoded; while the image loads
   the cover renders the neutral bordered skeleton chrome instead (see the
   `bindings` computed), so the loading state matches the common card skeleton.
   The element fill sits under the picture, continuous with that skeleton's
   element-coloured border, so the hand-off reads as the pattern fading out. */
.card-cover--image {
  overflow: hidden;
  border: none;
  background-color: var(--color-element);
}

.card-cover__image {
  border-radius: inherit;
}

/* Tiny cards shrink the pattern tile via --card-pattern-scale (set by the
   card's container-query chrome variants) so it still reads at ~43px. The
   inline --bgx-size from coverBindings stays the single source of tile size. */
.card-cover.pattern-mask::before {
  -webkit-mask-size: calc(var(--bgx-size) * var(--card-pattern-scale, 1));
  mask-size: calc(var(--bgx-size) * var(--card-pattern-scale, 1));
}
</style>
