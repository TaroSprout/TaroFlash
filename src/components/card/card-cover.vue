<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { SKELETON_COVER, coverBindings } from '@/utils/cover'
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

const img_el = useTemplateRef<HTMLImageElement>('img')
// Hold the shimmer skeleton until the image is fully decoded, so there's no raw
// pop-in — then fade it in via the shared reveal animation.
const decoded = ref(false)

// A cover with no chosen identity renders NEUTRAL chrome (the `element` role),
// not an accent — this is what a loading skeleton or an un-themed deck wants.
// `coverBindings` emits `data-palette` only when a palette is set, so the
// `:not([data-palette])` rules below pick up the neutral case for free.
//
// While a custom image is still decoding we render the SHARED skeleton cover
// (neutral diagonal-stripes) in place of the image's own config, so the loading
// placeholder is pixel-identical to the app's common card skeleton. Once the
// image decodes we drop the chrome entirely (`null`) and let the borderless
// full-bleed image below take over.
const bindings = computed(() => {
  if (decoded.value) return null
  return coverBindings(has_image.value ? SKELETON_COVER : cover, { border: false })
})

async function decodeThenReveal() {
  decoded.value = false
  await nextTick()

  const el = img_el.value
  if (!el) return

  // A cached image (e.g. flipping the preview away from the cover and back) is
  // already complete; decode() can reject on the reinserted element, so skip it
  // and reveal straight away rather than waiting on a decode that never settles.
  if (!isLoaded(el)) {
    try {
      await el.decode()
    } catch {
      // decode() also rejects if the src changed mid-flight — but only bail when
      // the image really isn't loaded, so a newer watch run takes over. If it IS
      // loaded, fall through and reveal so the skeleton never sticks forever.
      if (!isLoaded(el)) return
    }
  }

  decoded.value = true
  await nextTick()
  if (img_el.value) revealFaceImage(img_el.value)
}

function isLoaded(el: HTMLImageElement) {
  return el.complete && el.naturalWidth > 0
}

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
