<script setup lang="ts">
import { computed } from 'vue'
import CardFace from './card-face.vue'
import CardCover from './card-cover.vue'
import { type CardBase } from '@type/card'
import { cardImageUrl } from '@/api/media'
import { type SfxOptions } from '@/sfx/directive'
import { gsap } from 'gsap'

type CardProps = Partial<CardBase> & {
  size?: CardSize
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
  size = 'base',
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
    :class="`card-container--${size} card-container--${mode}`"
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
          :size="size"
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
          :size="size"
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
.card-container {
  perspective: 600px;

  --min-element-height: 80px;
  --face-image-padding: calc(var(--face-padding) / 2);
  --card-bg-color: var(--color-white);
  --card-text-color: var(--color-brown-700);
  --card-text-color--placeholder: var(--color-brown-500);

  aspect-ratio: var(--aspect-card);
  position: relative;
  width: var(--card-width);
  transition: width 0.05s ease-in-out;

  color: var(--card-text-color);
}

.card-container--2xl {
  --card-width: 380px;
  --face-border-width: 16px;
  --face-radius: 70px;
  --face-padding: 42px;
  --cover-icon-size: 30%;
}
.card-container--xl {
  --card-width: 314px;
  --face-border-width: 16px;
  --face-radius: 58px;
  --face-padding: 20px;
  --min-element-height: 80px;
  --cover-icon-size: 32%;
}
.card-container--lg {
  --card-width: 260px;
  --face-border-width: 16px;
  --face-radius: 56px;
  --face-padding: 24px;
  --cover-icon-size: 33%;
}
.card-container--md {
  --card-width: 240px;
  --face-border-width: 16px;
  --face-radius: 46px;
  --face-padding: 16px;
  --min-element-height: 80px;
  --cover-icon-size: 33%;
}
.card-container--base {
  --card-width: 192px;
  --face-border-width: 16px;
  --face-radius: 40px;
  --face-padding: 20px;
  --min-element-height: 80px;
  --cover-icon-size: 33%;
}
.card-container--sm {
  --card-width: 172px;
  --face-border-width: 16px;
  --face-radius: 32px;
  --face-padding: 10px;
  --cover-icon-size: 40%;
}
.card-container--xs {
  --card-width: 102px;
  --face-border-width: 16px;
  --face-radius: 24px;
  --face-padding: 4px;
  --cover-icon-size: 60%;
}
.card-container--2xs {
  --card-width: 43px;
  --face-border-width: 6px;
  --face-radius: 14px;
  --face-padding: 4px;
  --cover-icon-size: 80%;
}
.card-container--3xs {
  --card-width: 28px;
  --face-border-width: 2px;
  --face-radius: 8px;
  --face-padding: 1px;
  --cover-icon-size: 55%;
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
