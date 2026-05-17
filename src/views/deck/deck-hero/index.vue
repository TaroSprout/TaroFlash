<script setup lang="ts">
import Thumbnail from './thumbnail.vue'
import DeckDetails from './details.vue'
import Actions from './actions.vue'
import BulkActions from './bulk-actions.vue'
import { inject } from 'vue'
import { gsap } from 'gsap'
import { type CardListController } from '@/composables/card-editor/card-list-controller'

defineProps<{ deck: Deck; imageUrl?: string }>()

const editor = inject<CardListController | null>('card-editor', null)
const is_selecting = editor?.selection.is_selecting

const ANIM_DURATION = 0.22
const SLIDE_OFFSET = 16

function defaultEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { opacity: 0, scale: 0.92 },
    {
      opacity: 1,
      scale: 1,
      duration: ANIM_DURATION,
      ease: 'power2.out',
      clearProps: 'transform,opacity',
      onComplete: done
    }
  )
}

function defaultLeave(el: Element, done: () => void) {
  gsap.to(el, {
    opacity: 0,
    scale: 0.92,
    duration: ANIM_DURATION,
    ease: 'power2.out',
    onComplete: done
  })
}

function bulkEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { opacity: 0, y: SLIDE_OFFSET },
    {
      opacity: 1,
      y: 0,
      duration: ANIM_DURATION,
      ease: 'power2.out',
      clearProps: 'transform,opacity',
      onComplete: done
    }
  )
}

function bulkLeave(el: Element, done: () => void) {
  gsap.to(el, {
    opacity: 0,
    y: SLIDE_OFFSET,
    duration: ANIM_DURATION,
    ease: 'power2.out',
    onComplete: done
  })
}
</script>

<template>
  <div
    data-testid="deck-hero"
    class="flex max-w-full flex-col items-center gap-6 md:flex-row md:items-end xl:w-max xl:flex-col xl:items-start"
  >
    <thumbnail :deck="deck" />
    <deck-details :deck="deck" />

    <div data-testid="deck-hero__actions-wrap" class="relative w-full">
      <Transition :css="false" @enter="defaultEnter" @leave="defaultLeave">
        <actions v-if="!is_selecting" :deck="deck" />
      </Transition>

      <Transition :css="false" @enter="bulkEnter" @leave="bulkLeave">
        <bulk-actions v-if="is_selecting" class="absolute inset-0" />
      </Transition>
    </div>
  </div>
</template>
