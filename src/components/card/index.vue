<script setup lang="ts">
import { computed } from 'vue'
import CardFace from './card-face.vue'
import CardCover from './card-cover.vue'
import { type CardBase } from '@type/card'
import { cardImageUrl } from '@/api/media'
import { type SfxOptions } from '@/sfx/directive'
import { gsap } from 'gsap'

type CardProps = Partial<CardBase> & {
  mode?: 'view' | 'edit'
  side?: CardSide
  cover_config?: DeckCover
  card_attributes?: DeckCardAttributes
  face_classes?: string
  sfx?: SfxOptions
  error?: boolean
  shimmer?: boolean
}

const emit = defineEmits<{
  (e: 'flip-complete'): void
  (e: 'flip-out-complete'): void
}>()

const {
  side = 'front',
  mode = 'view',
  cover_config,
  card_attributes,
  front_image_path,
  back_image_path,
  error = false,
  shimmer = false
} = defineProps<CardProps>()

const front_image_url = computed(() => {
  if (!front_image_path) return undefined
  return cardImageUrl(front_image_path)
})

const back_image_url = computed(() => {
  if (!back_image_path) return undefined
  return cardImageUrl(back_image_path)
})

function onEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { rotateY: -60, translateY: '-12px', scale: 0.95 },
    {
      rotateY: 0,
      translateY: 0,
      scale: 1,
      duration: 0.2,
      ease: 'back.out(2)',
      onComplete: () => {
        done()
        emit('flip-complete')
      }
    }
  )
}

function onLeave(el: Element, done: () => void) {
  gsap.to(el, {
    rotateY: 60,
    translateY: '8px',
    scale: 0.95,
    duration: 0.12,
    ease: 'expo.in',
    onComplete: () => {
      done()
      emit('flip-out-complete')
    }
  })
}
</script>

<template>
  <div
    data-testid="card"
    translate="no"
    class="card-container"
    :class="`card-container--${mode}`"
    :data-error="error || undefined"
    v-sfx="sfx"
  >
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
          <template #image>
            <slot name="image"></slot>
          </template>
          <template #editor>
            <slot name="editor"></slot>
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
          <template #image>
            <slot name="image"></slot>
          </template>
          <template #editor>
            <slot name="editor"></slot>
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
   historical full-size values exactly: radius 58px, padding 20px. Floors keep
   tiny covers from collapsing to sharp corners / zero padding. */
.card-container > * {
  --face-radius: clamp(8px, 18.471cqi, 70px);
  --face-padding: clamp(2px, 6.369cqi, 42px);
  --face-image-padding: calc(var(--face-padding) / 2);

  /* Chrome (border band, cover icon, pattern tile) is two-variant, not fluid:
     the full band here, and a deliberately chunky tiny variant below. */
  --face-border-width: 16px;
  --cover-icon-size: 33%;
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

[data-theme='dark'] .card-container {
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
