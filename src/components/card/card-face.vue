<script setup lang="ts">
import { computed } from 'vue'
import textEditor from './text-editor.vue'
import { CARD_ATTRIBUTES_DEFAULTS } from '@/utils/deck/defaults'
import { cardTextScale } from '@/utils/card/text-scale'

type CardFaceProps = {
  image?: string
  text?: string
  mode?: 'view' | 'edit'
  attributes?: CardAttributes
}

const { image, text, attributes } = defineProps<CardFaceProps>()

const layout = computed(() => attributes?.image_layout ?? CARD_ATTRIBUTES_DEFAULTS.image_layout)

// Font size is fluid off the card width (cqi, see the text-region rule); the
// per-deck text_size level (1–10) only picks the multiplier. Both the default
// editor and any slotted editor inherit it via the cascade.
const text_scale = computed(() => cardTextScale(attributes?.text_size))
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

    <div
      data-testid="card-face__text-region"
      class="card-face__text-region"
      :style="{ '--card-text-scale': text_scale }"
    >
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
  --inner-radius: calc(var(--face-radius) - var(--face-padding));

  position: relative;
  display: flex;
  flex-direction: column;
  gap: calc(var(--face-image-padding) * 1.5);

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

/* Clip the text to the region box so long content can't spill past the card
   edges. Only the text is clipped — image-region controls (remove button, etc.)
   intentionally poke out and stay unclipped above. */
.card-face__text-region {
  flex: 0 0 auto;
  min-height: 0;

  overflow: hidden;

  /* 9.554cqi * level multiplier reproduces the historical level table exactly
     at --card-w-full (level 4 = 30px at 314px); tiny cards floor at 4px. */
  font-size: max(4px, calc(9.554cqi * var(--card-text-scale, 1)));
}

/* In above/below, the image shrinks as the text grows — but never below half
   the face. Past that the text region is capped at half and its overflow clips
   (see overflow: hidden above). */
.card-face[data-image='true']:not([data-layout='behind']) .card-face__image-region {
  min-height: 50%;
}

.card-face[data-image='true']:not([data-layout='behind']) .card-face__text-region {
  max-height: 50%;
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

/* ----- Full-bleed: a behind-layout image with no text fills the face ------- */
/* Only behind goes edge-to-edge. Above/below keep their padded image region in
   both modes: in view the image fills the padded face (see below), in edit the
   empty text region stays clickable so text can be typed back in. */
.card-face[data-image='true'][data-text='false'][data-layout='behind'] {
  padding: 0;
  gap: 0;
}

.card-face[data-image='true'][data-text='false'][data-layout='behind'] .card-face__image-region {
  position: absolute;
  inset: 0;
  flex: none;

  border-radius: var(--face-radius);
}

/* View only: drop the empty text region so nothing covers the image. In edit it
   stays (filling the face) so a click anywhere off the image controls focuses
   the editor to type — the corners dropzone backdrop is click-through. */
.card-face[data-mode='view'][data-image='true'][data-text='false'][data-layout='behind']
  .card-face__text-region {
  display: none;
}

/* Over a full-bleed image the placeholder would just clutter the picture — the
   text cursor already signals you can click to type. The text editor reads
   this var instead of us reaching into its internals. */
.card-face[data-mode='edit'][data-image='true'][data-text='false'][data-layout='behind'] {
  --text-editor-placeholder-display: none;
}

/* View, above/below, no text: drop the empty text region so the gap below the
   image collapses and the padded image fills the face symmetrically. (In edit
   the region is kept so it stays clickable.) */
.card-face[data-mode='view'][data-image='true'][data-text='false']:is(
    [data-layout='above'],
    [data-layout='below']
  )
  .card-face__text-region {
  display: none;
}

/* ----- Editor: hovering an image reveals a replaceable dropzone frame ------ */
/* The image keeps its padded region in above/below (with or without text), so
   the dashed frame sits just outside it. Behind layout uses floating corner
   controls over the text instead, so it's excluded here. */
.card-face[data-mode='edit'][data-image='true']:not([data-layout='behind'])
  .card-face__image-region {
  outline: 3px dashed transparent;
  outline-offset: 4px;
  transition:
    inset 0.15s ease,
    outline-color 0.15s ease,
    border-radius 0.15s ease;
}

.card-container[data-active]
  .card-face[data-mode='edit'][data-image='true']:not([data-layout='behind'])
  .card-face__image-region {
  outline-color: var(--color-brown-500);
}

.card-container[data-dragging]
  .card-face[data-mode='edit'][data-image='true']:not([data-layout='behind'])
  .card-face__image-region {
  outline-color: var(--color-blue-500);
}

[data-theme='dark']
  .card-container[data-dragging]
  .card-face[data-mode='edit'][data-image='true']:not([data-layout='behind'])
  .card-face__image-region {
  outline-color: var(--color-blue-650);
}

/* ----- Editor: dragging a replacement over a behind-layout image ----------- */
/* Behind images are full-bleed with floating corner controls, so there's no
   padded region to frame. While a file is dragged over it, pull the image in to
   gain padding and frame the whole face with the dashed drop affordance — the
   same cue the padded layouts show. */
.card-face[data-mode='edit'][data-layout='behind'][data-image='true'] .card-face__image-region {
  transition:
    inset 0.15s ease,
    border-radius 0.15s ease;
}

.card-container[data-dragging]
  .card-face[data-mode='edit'][data-layout='behind'][data-image='true']
  .card-face__image-region {
  inset: var(--face-padding);

  border-radius: var(--inner-radius);
}

.card-container[data-dragging]
  .card-face[data-mode='edit'][data-layout='behind'][data-image='true'] {
  outline: 3px dashed var(--color-blue-500);
  outline-offset: -3px;
  transition: outline-color 0.15s ease;
}

[data-theme='dark']
  .card-container[data-dragging]
  .card-face[data-mode='edit'][data-layout='behind'][data-image='true'] {
  outline-color: var(--color-blue-650);
}

.card-face__text-editor {
  color: var(--card-text-color);
}
.card-face__text-editor .text-editor__placeholder {
  color: var(--card-text-color--placeholder);
}
</style>
