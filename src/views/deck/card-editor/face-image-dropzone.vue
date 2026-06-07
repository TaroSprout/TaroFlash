<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'

type FaceImageDropzoneProps = {
  mode: 'region' | 'corners'
  image?: string
  active?: boolean
  disabled?: boolean
  error?: string
}

const {
  mode,
  image,
  active = false,
  disabled = false,
  error
} = defineProps<FaceImageDropzoneProps>()

const emit = defineEmits<{
  (e: 'browse'): void
  (e: 'remove'): void
  (e: 'dismiss-error'): void
}>()

const { t } = useI18n()

// Behind/full-bleed images reach the card edges with a large corner radius, so
// controls sit inset at the face padding to clear the rounded corner (matching
// the text inset). Region images are inset already, so the remove button pokes
// out past the image corner.
const remove_position = computed(() =>
  mode === 'corners' ? 'top-(--face-padding) right-(--face-padding)' : '-top-2 -right-2'
)
</script>

<template>
  <div
    data-testid="face-image-dropzone"
    :data-mode="mode"
    :data-active="active || undefined"
    class="face-image-dropzone"
  >
    <img
      v-if="mode === 'region' && image"
      data-testid="face-image-dropzone__image"
      :src="image"
      class="face-image-dropzone__image h-full w-full object-cover"
    />

    <ui-button
      v-if="!disabled"
      data-testid="face-image-dropzone__remove"
      icon-only
      icon-left="remove-image"
      data-theme="red-500"
      class="absolute! z-30 transition-opacity duration-150"
      :class="[
        remove_position,
        active ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      ]"
      @click.stop="emit('remove')"
    >
      {{ t('deck-view.card-editor.list-item.remove-image-button') }}
    </ui-button>

    <ui-button
      v-if="mode === 'corners' && !disabled"
      data-testid="face-image-dropzone__replace"
      icon-only
      icon-left="add-image"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      class="absolute! top-(--face-padding) left-(--face-padding) z-30 transition-opacity duration-150"
      :class="active ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
      @click.stop="emit('browse')"
    >
      {{ t('deck-view.card-editor.list-item.replace-image-button') }}
    </ui-button>

    <button
      v-if="mode === 'region' && !disabled && !error"
      type="button"
      data-testid="face-image-dropzone__scrim"
      class="face-image-dropzone__overlay face-image-dropzone__overlay--inset"
      @click.stop="emit('browse')"
    >
      <ui-icon src="add-image" class="size-12" />
      <p class="text-base">{{ t('deck-view.card-editor.list-item.replace-heading') }}</p>
    </button>

    <div
      v-if="error"
      data-testid="face-image-dropzone__error"
      data-error
      class="face-image-dropzone__overlay face-image-dropzone__overlay--inset"
      @mousedown.stop
      @click.stop="emit('browse')"
    >
      <ui-icon src="close" class="size-12" />
      <p class="text-base">{{ error }}</p>
      <ui-button
        data-testid="face-image-dropzone__dismiss-error"
        size="sm"
        data-theme="red-500"
        @click.stop="emit('dismiss-error')"
      >
        {{ t('deck-view.card-editor.list-item.dismiss-error-button') }}
      </ui-button>
    </div>
  </div>
</template>

<style>
/* Inherit the image region's radius so the image + scrim stay rounded without an
   overflow:hidden wrapper (which would clip the poked-out remove button). */
.face-image-dropzone[data-mode='region'] {
  position: relative;
  width: 100%;
  height: 100%;

  border-radius: inherit;
}

.face-image-dropzone__image {
  border-radius: inherit;
}

/* Corners mode overlays the whole face above the text so its controls sit on
   top of a behind-layout image; the backdrop itself stays click-through. */
.face-image-dropzone[data-mode='corners'] {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;

  border-radius: var(--face-radius);
}

.face-image-dropzone__overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding-inline: 1rem;

  text-align: center;

  cursor: pointer;
  transition:
    opacity 0.15s ease,
    border-color 0.15s ease;
}

.face-image-dropzone__overlay--inset {
  background-color: color-mix(in srgb, var(--color-white) 85%, transparent);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);

  border-radius: inherit;
  color: var(--color-brown-700);
  opacity: 0;
}

[data-theme='dark'] .face-image-dropzone__overlay--inset {
  background-color: color-mix(in srgb, var(--color-stone-700) 85%, transparent);
  color: var(--color-brown-100);
}

.face-image-dropzone[data-active] .face-image-dropzone__overlay--inset {
  pointer-events: auto;
  opacity: 1;
}

.face-image-dropzone__overlay[data-error] {
  pointer-events: auto;
  color: var(--color-red-500);
  opacity: 1;
}

/* Dragging a file over an image turns the replace scrim blue, matching the
   empty-card drop affordance. */
.card-container--edit[data-dragging] .face-image-dropzone__overlay:not([data-error]) {
  color: var(--color-blue-500);
}

[data-theme='dark']
  .card-container--edit[data-dragging]
  .face-image-dropzone__overlay:not([data-error]) {
  color: var(--color-blue-650);
}
</style>
