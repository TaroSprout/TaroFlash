<script setup lang="ts">
import CardGridSkeleton from './skeleton.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMatchMedia } from '@/composables/ui/media-query'
import { type CardGridSize } from '@/composables/deck/view-shell'
import { cardEditorKey } from '@/composables/card/list-controller'

const { t } = useI18n()

const { newCard } = inject(cardEditorKey)!

// On the narrowest screens the md backdrop cards get cramped — drop to base.
const is_compact = useMatchMedia('w<sm')
const skeleton_size = computed<CardGridSize>(() => (is_compact.value ? 'base' : 'md'))
</script>

<template>
  <div data-testid="card-grid-empty" class="relative w-full flex justify-center xl:flex-1">
    <card-grid-skeleton
      aria-hidden="true"
      :shimmer="false"
      :size="skeleton_size"
      :count="24"
      class="absolute inset-0"
    />

    <div
      data-testid="card-grid-empty__overlay"
      class="relative flex items-center justify-center pointer-events-none pt-18 pb-48 xl:absolute xl:inset-0 xl:py-0"
    >
      <div
        data-testid="card-grid-empty__content"
        class="flex flex-col items-center gap-4 pointer-events-auto text-brown-700 dark:text-brown-100"
      >
        <ui-icon src="card-deck" class="w-16 h-16" />

        <p data-testid="card-grid-empty__message" class="text-2xl">
          {{ t('deck-view.empty-state.heading') }}
        </p>

        <ui-button
          data-testid="card-grid-empty__create-button"
          data-theme="blue-500"
          data-theme-dark="blue-650"
          icon-left="card-add"
          @press="newCard"
        >
          {{ t('deck-view.empty-state.create-button') }}
        </ui-button>
      </div>
    </div>
  </div>
</template>
