<script setup lang="ts">
import CardFace from '@/components/card/card-face.vue'

type LayoutSkeletonProps = {
  layout: CardImageLayout
}

const { layout } = defineProps<LayoutSkeletonProps>()

// A 1×1 transparent pixel: card-face derives data-image from the `image` prop,
// so a truthy value flips the image region on. The visible block comes from the
// #image slot below (themed, unlike a static data-URI), so this is never drawn.
const IMAGE_FLAG = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
</script>

<template>
  <card-face
    data-testid="layout-skeleton"
    :image="IMAGE_FLAG"
    text=" "
    :attributes="{ image_layout: layout }"
  >
    <template #image>
      <div
        data-testid="layout-skeleton__image"
        class="h-full w-full bg-brown-300 dark:bg-grey-600"
      ></div>
    </template>

    <template #editor>
      <div
        data-testid="layout-skeleton__text"
        class="flex flex-col items-center justify-center gap-1"
      >
        <span class="h-1.5 w-3/4 rounded-full bg-brown-500 dark:bg-grey-700"></span>
        <span class="h-1.5 w-1/2 rounded-full bg-brown-500 dark:bg-grey-700"></span>
      </div>
    </template>
  </card-face>
</template>
