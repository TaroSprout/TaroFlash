<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { SKELETON_COVER, coverBindings } from '@/utils/cover'
import { useImageReveal } from '@/composables/card/image-reveal'
import UiIcon from '@/components/ui-kit/icon.vue'

const { cover } = defineProps<{
  cover?: DeckCover
}>()

const img_el = useTemplateRef<HTMLImageElement>('img')
/** True once this cover has a custom image — palette/pattern/icon stay configured but stop rendering behind it. */
const has_image = computed(() => !!cover?.image_path)
const { decoded, onLoad } = useImageReveal(() => cover?.image_path, img_el)

/** Chrome bindings for the cover; null once the image decodes, so the picture goes full-bleed with no chrome underneath. */
const bindings = computed(() => {
  if (decoded.value) return null
  return coverBindings(has_image.value ? SKELETON_COVER : cover, { border: false })
})

/** Yellow, except on a yellow cover — there the icon would vanish into the fill. */
const icon_palette = computed<PaletteName>(() =>
  cover?.palette === 'yellow' ? 'purple' : 'yellow'
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
        : 'bg-(--color-accent) text-(--color-on-accent) not-[[data-palette]]:bg-raised not-[[data-palette]]:text-ink',
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
      @load="onLoad"
    />

    <div
      v-else-if="cover?.icon"
      data-testid="card-cover__icon"
      :data-palette="icon_palette"
      class="card-cover__icon [&>svg]:w-full [&>svg]:h-full text-(--color-accent)"
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

/* No palette → neutral cover: the border steps off the accent onto the raised
   chrome role, matching the neutral fill above. The icon keeps its own palette
   either way — it is not part of the cover's colour. */
.card-cover:not([data-palette]) {
  border-color: var(--color-raised);
}

/* Applied only once the image decodes; before that the neutral skeleton chrome
   renders instead — see the `bindings` computed above. */
.card-cover--image {
  overflow: hidden;
  border: none;
  background-color: var(--color-raised);
}

.card-cover__image {
  border-radius: inherit;
}

/* Tiny cards shrink the pattern tile via --card-pattern-scale; the inline
   --bgx-size from coverBindings stays the single source of tile size. */
.card-cover.pattern-mask::before {
  -webkit-mask-size: calc(var(--bgx-size) * var(--card-pattern-scale, 1));
  mask-size: calc(var(--bgx-size) * var(--card-pattern-scale, 1));
}
</style>
