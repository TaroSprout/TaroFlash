<script setup lang="ts">
import CardGridSkeleton from './skeleton.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMatchMedia } from '@/composables/ui/media-query'
import { type CardGridSize } from '@/views/deck/composables/view-shell'
import { useEditorSurface } from '@/views/deck/composables'

type EmptyStateProps = {
  icon?: string
  message?: string
  /** Off for a surface where the member is already part-way through adding cards, so there is nothing to invite. */
  show_button?: boolean
  /** Size of the backdrop cards; left unset they follow the viewport, as the deck's own empty deck does. */
  size?: CardGridSize
}

const { icon = 'card-deck', message, show_button = true, size } = defineProps<EmptyStateProps>()

const { t } = useI18n()

const surface = useEditorSurface()

// On the narrowest screens the md backdrop cards get cramped — drop to base.
const is_compact = useMatchMedia('w<sm')

const skeleton_size = computed<CardGridSize>(() => size ?? (is_compact.value ? 'base' : 'md'))
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
        class="flex flex-col items-center gap-4 pointer-events-auto text-ink"
      >
        <ui-icon :src="icon" class="w-16 h-16" />

        <p data-testid="card-grid-empty__message" class="text-2xl text-center">
          {{ message ?? t('deck-view.empty-state.heading') }}
        </p>

        <ui-button
          v-if="show_button"
          data-testid="card-grid-empty__create-button"
          data-palette="brand"
          icon-left="card-add"
          @press="surface.openNewCard"
        >
          {{ t('deck-view.empty-state.create-button') }}
        </ui-button>
      </div>
    </div>
  </div>
</template>
