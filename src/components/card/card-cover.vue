<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { coverBindings } from '@/utils/cover'
import { revealFaceImage } from '@/utils/animations/face-image'
import UiIcon from '@/components/ui-kit/icon.vue'

const { cover } = defineProps<{
  cover?: DeckCover
}>()

// A custom cover image fills the cover on its own — palette, pattern, and icon
// are kept in the config but never shown behind it. `image_path` holds either
// the uploaded public URL or, while staged in the designer, a local objectURL;
// both are valid <img> sources as-is (no cardImageUrl transform).
const has_image = computed(() => !!cover?.image_path)

// A cover with no chosen identity renders NEUTRAL chrome (the `element` role),
// not an accent — this is what a loading skeleton or an un-themed deck wants.
// `coverBindings` emits `data-palette` only when a palette is set, so the
// `:not([data-palette])` rules below pick up the neutral case for free. Skipped
// entirely when an image is set so the palette never flashes behind it.
const bindings = computed(() => (has_image.value ? null : coverBindings(cover, { border: false })))

const img_el = useTemplateRef<HTMLImageElement>('img')
// Show the shimmer skeleton until the image is fully decoded, so there's no raw
// pop-in — then fade it in via the shared reveal animation.
const decoded = ref(false)

// Re-run the decode gate whenever the source changes (initial paint, replace).
watch(
  () => cover?.image_path,
  (path) => {
    if (!path) {
      decoded.value = false
      return
    }
    decodeThenReveal()
  },
  { immediate: true }
)

async function decodeThenReveal() {
  decoded.value = false
  await nextTick()

  const el = img_el.value
  if (!el) return

  try {
    await el.decode()
  } catch {
    // decode() rejects if the src changes mid-flight; the next watch run takes over.
    return
  }

  decoded.value = true
  await nextTick()
  if (img_el.value) revealFaceImage(img_el.value)
}
</script>

<template>
  <div
    data-testid="card-cover"
    v-bind="bindings"
    class="card-cover flex items-center justify-center"
    :class="[
      has_image
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

/* An image cover has no chrome band — the picture goes edge-to-edge, clipped to
   the face radius. The neutral element fill sits under it as the shimmer base. */
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
