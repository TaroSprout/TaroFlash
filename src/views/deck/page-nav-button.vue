<script setup lang="ts">
import { computed, inject } from 'vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useModeConfig } from './modes'
import { cardEditorKey } from '@/composables/card-editor/card-list-controller'

type PageNavButtonProps = {
  direction: 'prev' | 'next'
}

const { direction } = defineProps<PageNavButtonProps>()

const editor = inject(cardEditorKey)!
const mode_config = useModeConfig()

const is_prev = computed(() => direction === 'prev')
const testid = computed(() => `deck-view__${is_prev.value ? 'previous' : 'next'}-page-button`)
const icon = computed(() => (is_prev.value ? 'arrow-left' : 'arrow-right'))
const column = computed(() => (is_prev.value ? 'sm:col-start-1' : 'sm:col-start-3'))

function onClick() {
  if (is_prev.value) editor.carousel.prevPage()
  else editor.carousel.nextPage()
}
</script>

<template>
  <ui-button
    :data-testid="testid"
    data-theme="brown-300"
    data-theme-dark="stone-700"
    class="sm:row-start-2 self-center max-sm:hidden! transition duration-300"
    :class="[column, { 'opacity-0 pointer-events-none': !mode_config.pagination }]"
    icon-only
    :icon-left="icon"
    @click="onClick"
  >
    <slot />
  </ui-button>
</template>
