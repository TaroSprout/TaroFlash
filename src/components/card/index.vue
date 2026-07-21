<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import CardFace from './card-face.vue'
import CardCover from './card-cover.vue'
import FaceImageLayer from './face-image-layer.vue'
import ImageDropzone from './image-dropzone.vue'
import { type CardBase } from '@type/card'
import { cardImageUrl } from '@/api/media'
import { type SfxOptions } from '@/sfx/directive'
import { flipEnter, flipLeave } from '@/utils/animations/flip'

type CardProps = Partial<CardBase> & {
  mode?: 'view' | 'edit'
  side?: CardSide
  cover_config?: DeckCover
  card_attributes?: DeckCardAttributes
  face_classes?: string
  sfx?: SfxOptions
  error?: boolean
  shimmer?: boolean
  // Edit mode only: mount the image-edit layer (dropzone / picker / overlays)
  // for the active face.
  image_editing?: boolean
  disabled?: boolean
}

const emit = defineEmits<{
  (e: 'flip-complete'): void
  (e: 'flip-out-complete'): void
}>()

const {
  id,
  deck_id,
  side = 'front',
  mode = 'view',
  cover_config,
  card_attributes,
  front_image_path,
  back_image_path,
  error = false,
  shimmer = false,
  image_editing = false,
  disabled = false
} = defineProps<CardProps>()

const root_el = useTemplateRef<HTMLElement>('root')
const image_layer = useTemplateRef<InstanceType<typeof FaceImageLayer>>('image_layer')

const front_image_url = computed(() => {
  if (!front_image_path) return undefined
  return cardImageUrl(front_image_path)
})

const back_image_url = computed(() => {
  if (!back_image_path) return undefined
  return cardImageUrl(back_image_path)
})

const editing_images = computed(
  () => image_editing && mode === 'edit' && (side === 'front' || side === 'back')
)
const active_face = computed<'front' | 'back'>(() => (side === 'back' ? 'back' : 'front'))

// The persisted-card slice the image layer's upload seam needs; temp cards
// (id <= 0) keep the layer mounted but upload-gated.
const upload_card = computed(() => ({ id: id ?? 0, deck_id, front_image_path, back_image_path }))

// Host editors (e.g. the mobile editor's menu) drive add/remove through this.
const image_controls = computed(() => {
  const layer = image_layer.value
  return layer ? { openPicker: layer.openPicker, onRemove: layer.onRemove } : null
})

defineExpose({ image_controls })

function onEnter(el: Element, done: () => void) {
  flipEnter(el, 'y', () => {
    done()
    emit('flip-complete')
  })
}

function onLeave(el: Element, done: () => void) {
  flipLeave(el, 'y', () => {
    done()
    emit('flip-out-complete')
  })
}
</script>

<template>
  <div
    ref="root"
    data-testid="card"
    translate="no"
    class="card-container"
    :class="{ 'pointer-events-none': disabled }"
    :data-error="error || undefined"
    :data-active="image_layer?.active || undefined"
    :data-dragging="image_layer?.dragging || undefined"
    :data-loading="image_layer?.pending || undefined"
    v-sfx="sfx ?? image_layer?.card_sfx"
  >
    <face-image-layer
      v-if="editing_images"
      ref="image_layer"
      :card="upload_card"
      :side="active_face"
      :attributes="card_attributes?.[active_face]"
      :root="root_el"
      :disabled="disabled"
    />

    <slot></slot>

    <div v-if="shimmer" class="card-shimmer shimmer" aria-hidden="true" />

    <transition mode="out-in" @enter="onEnter" @leave="onLeave">
      <card-cover v-if="side === 'cover'" :cover="cover_config" />

      <slot name="front" v-else-if="side === 'front'">
        <card-face
          data-testid="card-face__front"
          :class="face_classes"
          :image="front_image_url"
          :text="front_text"
          :mode="mode"
          :attributes="card_attributes?.front"
        >
          <template v-if="image_layer?.region_dropzone" #image>
            <image-dropzone
              mode="region"
              :image="image_layer.image_url"
              :active="image_layer.active"
              :error="image_layer.error_message"
              @pointerenter="image_layer.onRegionPointerEnter"
              @pointerleave="image_layer.onPointerLeave"
              @browse="image_layer.openPicker"
              @remove="image_layer.onRemove"
              @dismiss-error="image_layer.onDismissError"
            />
          </template>
          <template v-else #image>
            <slot name="image"></slot>
          </template>
          <template v-if="$slots.editor" #editor>
            <div
              data-testid="card__editor"
              :inert="image_layer?.covered || undefined"
              class="h-full w-full"
            >
              <slot name="editor"></slot>
            </div>
          </template>
        </card-face>
      </slot>

      <slot name="back" v-else-if="side === 'back'">
        <card-face
          data-testid="card-face__back"
          :class="face_classes"
          :image="back_image_url"
          :text="back_text"
          :mode="mode"
          :attributes="card_attributes?.back"
        >
          <template v-if="image_layer?.region_dropzone" #image>
            <image-dropzone
              mode="region"
              :image="image_layer.image_url"
              :active="image_layer.active"
              :error="image_layer.error_message"
              @pointerenter="image_layer.onRegionPointerEnter"
              @pointerleave="image_layer.onPointerLeave"
              @browse="image_layer.openPicker"
              @remove="image_layer.onRemove"
              @dismiss-error="image_layer.onDismissError"
            />
          </template>
          <template v-else #image>
            <slot name="image"></slot>
          </template>
          <template v-if="$slots.editor" #editor>
            <div
              data-testid="card__editor"
              :inert="image_layer?.covered || undefined"
              class="h-full w-full"
            >
              <slot name="editor"></slot>
            </div>
          </template>
        </card-face>
      </slot>
    </transition>
  </div>
</template>

<style>
/* The card is width-fluid: it fills its parent and everything inside scales
   off the resolved width via container-query (cqi) units. The container is the
   card root itself, so the geometry vars below live on its direct children —
   cqi units on the container element would resolve against an ancestor.

   The base rule sits in the components layer so width utilities on the card
   (`w-[260px]`, `w-(--card-w-full)`) can override the fluid 100% default —
   unlayered SFC CSS would always beat Tailwind's layered utilities. */
@layer components {
  .card-container {
    container-type: inline-size;
    perspective: 600px;

    --card-bg-color: var(--color-white);
    --card-text-color: var(--color-brown-700);
    --card-text-color--placeholder: var(--color-brown-500);

    aspect-ratio: var(--aspect-card);
    position: relative;
    width: 100%;

    color: var(--card-text-color);
  }
}

/* Fluid geometry, calibrated so a card at --card-w-full (314px) reproduces the
   historical full-size padding (20px); radius is deliberately rounder than the
   historical 58px. Floors keep tiny covers from collapsing to sharp corners /
   zero padding and keep the cover icon legible. */
.card-container > * {
  --face-radius: clamp(14px, 22cqi, 70px);
  --face-padding: clamp(2px, 6.369cqi, 42px);
  --face-image-padding: calc(var(--face-padding) / 2);

  /* Chrome (border band, cover icon, pattern tile) is two-variant, not fluid:
     the full band here, and a deliberately chunky tiny variant below. */
  --face-border-width: 16px;
  --cover-icon-size: clamp(42px, 33%, 200px);
  --card-pattern-scale: 1;
}

/* Tiny cards (list-leading swatches and the like): the fluid band would smear
   away, so switch to intentionally chunky chrome that still reads at ~43px. */
@container (max-width: 72px) {
  .card-container > * {
    --face-border-width: 6px;
    --cover-icon-size: 80%;
    --card-pattern-scale: 0.5;
  }
}

/* Behind the translucent loading scrim the placeholder would read through on an
   empty card — hide it while an upload/removal is in flight. */
.card-container[data-loading] {
  --text-editor-placeholder-display: none;
}

[data-mode='dark'] .card-container {
  --card-bg-color: var(--color-stone-700);
  --card-text-color: var(--color-brown-100);
  --card-text-color--placeholder: var(--color-brown-500);
}

.card-shimmer {
  position: absolute;
  inset: 0;
  border-radius: var(--face-radius);
  pointer-events: none;
  z-index: 10;
}
</style>
