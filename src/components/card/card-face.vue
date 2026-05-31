<script setup lang="ts">
import textEditor from '../text-editor/text-editor.vue'

const { image, text } = defineProps<{
  image?: string
  text?: string
  mode?: 'view' | 'edit'
  attributes?: CardAttributes
}>()
</script>

<template>
  <div class="card-face" :data-image="!!image" :data-text="!!text" :data-mode="mode">
    <img
      v-if="image"
      data-testid="card-face__image"
      :src="image"
      class="card-face__image h-full w-full object-cover"
    />

    <slot name="editor" v-else>
      <text-editor
        :content="text"
        :attributes="attributes"
        disabled
        class="card-face__text-editor w-full h-full"
      />
    </slot>
  </div>
</template>

<style>
.card-face {
  --inner-radius: calc(var(--face-radius) - var(--face-border-width) - var(--face-padding));

  width: 100%;
  height: 100%;
  padding: var(--face-padding);

  border-radius: var(--face-radius);
  background-color: var(--card-bg-color);

  aspect-ratio: var(--aspect-card);
}
.card-face[data-mode='edit']:focus-within {
  outline: 2px solid var(--color-blue-500);
}

.card-container[data-error] .card-face {
  outline: 2px solid var(--color-red-500);
}

.card-face[data-mode='edit'][data-image='false'] {
  grid-template-rows: auto 1fr;
}

.card-face[data-mode='view'][data-image='true'][data-text='false'],
.card-face[data-mode='view'][data-image='false'][data-text='true'] {
  grid-template-rows: 1fr;
}

.card-face[data-mode='edit'] {
  --face-border-width: 0px;
}

.card-face[data-mode='view'][data-text='false'] {
  --face-padding: 0px;
}

.card-face[data-mode='view'][data-text='false'][data-image='false'],
.card-face[data-mode='view'][data-image='false']:has(.ql-blank) {
  /* background-image: var(--bgx-diagonal-stripes); */
  background-color: var(--color-purple-400);
}

.card-face[data-image='true'] {
  overflow: hidden;
}

/* Images fill the face by default — always in view mode, and in the editor
   until the card is hovered. */
.card-face[data-mode='view'][data-image='true'],
.card-face[data-mode='edit'][data-image='true'] {
  padding: 0;
}

/* Card editor: hovering anywhere on the card reveals a dropzone-style frame —
   the card background and a dashed border show around a padded, inner-rounded
   image, signalling the image is replaceable. The dashed outline is inset so it
   reads as a border around the card without shifting layout. */
.card-face[data-mode='edit'][data-image='true'] {
  outline: 3px dashed transparent;
  outline-offset: -3px;
  transition:
    padding 0.15s ease,
    outline-color 0.15s ease;
}

.card-face[data-mode='edit'] .card-face__image {
  border-radius: var(--face-radius);
  transition: border-radius 0.15s ease;
}

.card-container--edit[data-active] .card-face[data-mode='edit'][data-image='true'] {
  padding: var(--face-image-padding);
  outline-color: var(--color-brown-500);
}

/* While a file is dragged over, the frame turns blue to match the drop affordance. */
.card-container--edit[data-dragging] .card-face[data-mode='edit'][data-image='true'] {
  outline-color: var(--color-blue-500);
}

[data-theme='dark']
  .card-container--edit[data-dragging]
  .card-face[data-mode='edit'][data-image='true'] {
  outline-color: var(--color-blue-650);
}

.card-container--edit[data-active] .card-face[data-mode='edit'] .card-face__image {
  border-radius: calc(var(--face-radius) - var(--face-image-padding));
}

.card-face__text-editor {
  color: var(--card-text-color);
}
.card-face__text-editor .text-editor__placeholder {
  color: var(--card-text-color--placeholder);
}
</style>
