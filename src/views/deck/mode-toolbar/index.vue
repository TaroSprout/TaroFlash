<script setup lang="ts">
import ModeView from './mode-view.vue'
import BulkToolbar from './bulk-toolbar.vue'
import { computed, inject } from 'vue'
import { gsap } from 'gsap'
import { type CardListController } from '@/composables/card-editor/card-list-controller'

const { selection } = inject<CardListController>('card-editor')!

const toolbarComponent = computed(() => (selection.is_selecting.value ? BulkToolbar : ModeView))

const ANIM_DURATION = 0.2
const OFFSET = 12

function onEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { opacity: 0, y: OFFSET },
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

function onLeave(el: Element, done: () => void) {
  const node = el as HTMLElement
  node.style.position = 'absolute'
  node.style.inset = '0'
  gsap.to(el, {
    opacity: 0,
    y: -OFFSET,
    duration: ANIM_DURATION,
    ease: 'power2.out',
    onComplete: done
  })
}
</script>

<template>
  <div data-testid="mode-toolbar-container" class="w-full z-10 relative">
    <Transition :css="false" @enter="onEnter" @leave="onLeave">
      <component :is="toolbarComponent" :key="toolbarComponent.__name" />
    </Transition>
    <div class="bg-brown-100 dark:bg-grey-900 p-2 rounded-5 absolute -inset-2 -z-1"></div>
  </div>
</template>
