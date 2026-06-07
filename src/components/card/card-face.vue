<script setup lang="ts">
import { computed } from 'vue'
import textEditor from '../text-editor/text-editor.vue'
import { CARD_ATTRIBUTES_DEFAULTS } from '@/utils/deck/defaults'

const { image, text, attributes } = defineProps<{
  image?: string
  text?: string
  mode?: 'view' | 'edit'
  attributes?: CardAttributes
}>()

const layout = computed(() => attributes?.image_layout ?? CARD_ATTRIBUTES_DEFAULTS.image_layout)
</script>

<template>
  <div
    class="card-face"
    :data-image="!!image"
    :data-text="!!text"
    :data-mode="mode"
    :data-layout="layout"
  >
    <div data-testid="card-face__image-region" class="card-face__image-region">
      <slot name="image">
        <img
          v-if="image"
          data-testid="card-face__image"
          :src="image"
          class="card-face__image h-full w-full object-cover"
        />
      </slot>
    </div>

    <div data-testid="card-face__text-region" class="card-face__text-region">
      <slot name="editor">
        <text-editor
          :content="text"
          :attributes="attributes"
          disabled
          class="card-face__text-editor w-full h-full"
        />
      </slot>
    </div>
  </div>
</template>

<style>
.card-face {
  --inner-radius: calc(var(--face-radius) - var(--face-border-width) - var(--face-padding));

  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--face-image-padding);

  width: 100%;
  height: 100%;
  padding: var(--face-padding);

  border-radius: var(--face-radius);
  background-color: var(--card-bg-color);

  aspect-ratio: var(--aspect-card);
}

.card-face[data-mode='edit'] {
  --face-border-width: 0px;
}

.card-face[data-mode='edit']:focus-within {
  outline: 2px solid var(--color-blue-500);
}

.card-container[data-error] .card-face {
  outline: 2px solid var(--color-red-500);
}

/* ----- Region placement by image layout ----------------------------------- */
/* DOM order is image-region then text-region; layout reorders / repositions. */

/* above: image on top, text below */
.card-face[data-layout='above'] {
  flex-direction: column;
}

/* below: image on the bottom, text above */
.card-face[data-layout='below'] {
  flex-direction: column-reverse;
}

/* No overflow:hidden here — the editor's remove button pokes out of the corner
   and must not be clipped. The image itself rounds via border-radius instead. */
.card-face__image-region {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;

  border-radius: var(--inner-radius);
}

.card-face__image {
  border-radius: inherit;
}

.card-face__text-region {
  flex: 0 0 auto;
  min-height: 0;
}

/* behind: image fills the face, text floats on top of it */
.card-face[data-layout='behind'] .card-face__image-region {
  position: absolute;
  inset: 0;
  z-index: 0;

  border-radius: var(--face-radius);
}

.card-face[data-layout='behind'] .card-face__text-region {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
}

/* ----- No image: text fills the face -------------------------------------- */
.card-face[data-image='false'] .card-face__image-region {
  display: none;
}

.card-face[data-image='false'] .card-face__text-region {
  flex: 1 1 auto;
}

/* ----- Full-bleed: an image with no text fills the face in every layout ---- */
.card-face[data-image='true'][data-text='false'] {
  padding: 0;
  gap: 0;
}

.card-face[data-image='true'][data-text='false'] .card-face__image-region {
  position: absolute;
  inset: 0;
  flex: none;

  border-radius: var(--face-radius);
}

.card-face[data-image='true'][data-text='false'] .card-face__text-region {
  display: none;
}

/* Empty card (no image, no text) shows the placeholder backdrop edge-to-edge. */
.card-face[data-mode='view'][data-image='false'][data-text='false'],
.card-face[data-mode='view'][data-image='false']:has(.ql-blank) {
  padding: 0;
  background-color: var(--color-purple-400);
}

/* ----- Editor: hovering an image reveals a replaceable dropzone frame ------ */
/* The image region gets a dashed frame on hover/drag for above/below and the
   full-bleed no-text case. Behind layout uses floating corner controls over the
   text instead, so it's excluded here. */
.card-face[data-mode='edit'][data-image='true']:not([data-layout='behind'])
  .card-face__image-region {
  outline: 3px dashed transparent;
  outline-offset: -3px;
  transition:
    inset 0.15s ease,
    outline-color 0.15s ease,
    border-radius 0.15s ease;
}

/* above/below: the image stays put; draw the dashed frame just outside it. */
.card-face[data-mode='edit'][data-image='true'][data-text='true']:not([data-layout='behind'])
  .card-face__image-region {
  outline-offset: 4px;
}

.card-container--edit[data-active]
  .card-face[data-mode='edit'][data-image='true']:not([data-layout='behind'])
  .card-face__image-region {
  outline-color: var(--color-brown-500);
}

.card-container--edit[data-dragging]
  .card-face[data-mode='edit'][data-image='true']:not([data-layout='behind'])
  .card-face__image-region {
  outline-color: var(--color-blue-500);
}

[data-theme='dark']
  .card-container--edit[data-dragging]
  .card-face[data-mode='edit'][data-image='true']:not([data-layout='behind'])
  .card-face__image-region {
  outline-color: var(--color-blue-650);
}

/* Full-bleed (no text): the image is absolutely positioned and fills the face,
   so there's no room outside it — inset it on hover and draw the frame in the
   revealed gap instead. */
.card-container--edit[data-active]
  .card-face[data-mode='edit'][data-image='true'][data-text='false']:not([data-layout='behind'])
  .card-face__image-region {
  inset: var(--face-image-padding);

  border-radius: calc(var(--face-radius) - var(--face-image-padding));
}

.card-face__text-editor {
  color: var(--card-text-color);
}
.card-face__text-editor .text-editor__placeholder {
  color: var(--card-text-color--placeholder);
}
</style>
