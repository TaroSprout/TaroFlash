<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'

type FaceOverlayProps = {
  // full: fills the whole face (empty-face drop target); inset: scrim over the
  // image region (or the whole face in corners mode), revealed via `active`.
  variant: 'full' | 'inset'
  error?: string
  heading?: string
  active?: boolean
}

const { variant, error, heading, active = false } = defineProps<FaceOverlayProps>()

const emit = defineEmits<{
  (e: 'browse'): void
  (e: 'dismiss-error'): void
}>()

const { t } = useI18n()
</script>

<template>
  <div
    v-if="error"
    data-testid="face-overlay__error"
    data-error
    class="face-overlay"
    :data-variant="variant"
    @mousedown.stop
    @click.stop="emit('browse')"
  >
    <ui-icon src="close" class="size-12" />
    <p class="text-base">{{ error }}</p>
    <ui-button
      data-testid="face-overlay__dismiss-error"
      size="sm"
      data-palette="error"
      @click.stop="emit('dismiss-error')"
    >
      {{ t('card.image-editor.dismiss-error-button') }}
    </ui-button>
  </div>

  <button
    v-else
    type="button"
    data-testid="face-overlay__browse"
    class="face-overlay"
    :data-variant="variant"
    :data-active="active || undefined"
    @click.stop="emit('browse')"
  >
    <ui-icon src="add-image" class="size-12" />
    <p v-if="heading" class="text-base">{{ heading }}</p>
  </button>
</template>

<style>
.face-overlay {
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

.face-overlay[data-variant='full'] {
  border: 3px dashed var(--color-blue-500);
  border-radius: var(--face-radius);
  background-color: var(--color-white);

  color: var(--color-blue-500);
}

[data-mode='dark'] .face-overlay[data-variant='full'] {
  background-color: var(--color-stone-700);
}

[data-mode='dark'] .face-overlay[data-variant='full']:not([data-error]) {
  border-color: var(--color-blue-650);
  color: var(--color-blue-650);
}

.face-overlay[data-variant='full'][data-error] {
  border-color: var(--color-red-500);
  color: var(--color-red-500);
}

/* Inherits the radius of whatever region it scrims (image region / corners
   backdrop) and stays invisible until hovered/dragged (`active`) or erroring. */
.face-overlay[data-variant='inset'] {
  background-color: color-mix(in srgb, var(--color-white) 85%, transparent);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);

  border-radius: inherit;
  color: var(--color-brown-700);
  opacity: 0;
}

[data-mode='dark'] .face-overlay[data-variant='inset'] {
  background-color: color-mix(in srgb, var(--color-stone-700) 85%, transparent);
  color: var(--color-brown-100);
}

.face-overlay[data-variant='inset'][data-active] {
  pointer-events: auto;
  opacity: 1;
}

.face-overlay[data-variant='inset'][data-error] {
  pointer-events: auto;
  color: var(--color-red-500);
  opacity: 1;
}

/* Dragging a file over the card turns the scrim blue, matching the empty-card
   drop affordance. The drag state lives on the card root, set by the card. */
.card-container[data-dragging] .face-overlay:not([data-error]) {
  color: var(--color-blue-500);
}

[data-mode='dark'] .card-container[data-dragging] .face-overlay:not([data-error]) {
  color: var(--color-blue-650);
}
</style>
