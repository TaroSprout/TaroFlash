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

/** Multiplier applied to the fluid, width-based font size; both the default and any slotted editor inherit it via the CSS cascade. */
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
  outline: 2px solid var(--color-accent);
}

.card-container[data-error] .card-face {
  outline: 2px solid var(--color-accent);
}

/* DOM order is always image-region then text-region; layout reorders/repositions
   below rather than changing markup order. */
.card-face[data-layout='above'] {
  flex-direction: column;
}

.card-face[data-layout='below'] {
  flex-direction: column-reverse;
}

/* No overflow:hidden here — the editor's remove button pokes out of the corner
   and must not be clipped; the image itself rounds via border-radius instead. */
.card-face__image-region {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;

  border-radius: var(--inner-radius);
}

.card-face__image {
  border-radius: inherit;
}

/* Clips text so long content can't spill past the card edges; image-region
   controls (remove button, etc.) intentionally stay unclipped above. */
.card-face__text-region {
  flex: 0 0 auto;
  min-height: 0;

  overflow: hidden;

  /* 9.554cqi * text-scale reproduces the old level table (level 4 = 30px @314px); floors at 4px for tiny cards. */
  font-size: max(4px, calc(9.554cqi * var(--card-text-scale, 1)));
}

/* Image can shrink as text grows, but never below half the face; the text
   region caps at the other half and clips past that. */
.card-face[data-image='true']:not([data-layout='behind']) .card-face__image-region {
  min-height: 50%;
}

.card-face[data-image='true']:not([data-layout='behind']) .card-face__text-region {
  max-height: 50%;
}

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

.card-face[data-image='false'] .card-face__image-region {
  display: none;
}

.card-face[data-image='false'] .card-face__text-region {
  flex: 1 1 auto;
}

/* Only `behind` goes edge-to-edge; above/below keep their padded image region
   in both view and edit modes. */
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

/* View only — edit mode keeps the empty text region so a click off the image
   still focuses the editor to type. */
.card-face[data-mode='view'][data-image='true'][data-text='false'][data-layout='behind']
  .card-face__text-region {
  display: none;
}

/* Text editor reads this var itself — don't reach into its internals to hide
   the placeholder over a full-bleed image. */
.card-face[data-mode='edit'][data-image='true'][data-text='false'][data-layout='behind'] {
  --text-editor-placeholder-display: none;
}

/* Drops the empty text region in view so the image fills the face
   symmetrically; edit keeps it so it stays clickable. */
.card-face[data-mode='view'][data-image='true'][data-text='false']:is(
    [data-layout='above'],
    [data-layout='below']
  )
  .card-face__text-region {
  display: none;
}

/* Frames the padded image region with a dashed drop affordance; `behind`
   layout uses floating corner controls instead and is excluded here. */
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
  outline-color: var(--color-ink-muted);
}

.card-container[data-dragging]
  .card-face[data-mode='edit'][data-image='true']:not([data-layout='behind'])
  .card-face__image-region {
  outline-color: var(--color-accent);
}

/* Behind images have no padded region to frame; while dragging, pull the image
   in and frame the whole face with the same dashed affordance instead. */
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
  outline: 3px dashed var(--color-accent);
  outline-offset: -3px;
  transition: outline-color 0.15s ease;
}

.card-face__text-editor {
  color: var(--card-text-color);
}
.card-face__text-editor .text-editor__placeholder {
  color: var(--card-text-color--placeholder);
}
</style>
