<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import UiSelectMenu from '@/components/ui-kit/select-menu.vue'
import UiOptionGroup from '@/components/ui-kit/option-group.vue'
import {
  deckViewShellKey,
  type CardGridSize,
  type CardSortKey
} from '@/views/deck/composables/view-shell'
import { useMatchMedia } from '@/composables/ui/media-query'
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { grid_size, setGridSize, grid_face, setGridFace, sort_by, setSortBy, closePageSettings } =
  inject(deckViewShellKey)!
const is_mobile = useMatchMedia('w<md')

const face_options = [
  { value: 'front' as const, label: t('deck-view.page-settings.face-front') },
  { value: 'back' as const, label: t('deck-view.page-settings.face-back') }
]

const size_options = [
  { value: 'base' as CardGridSize, label: t('deck-view.page-settings.card-size-small') },
  { value: 'md' as CardGridSize, label: t('deck-view.page-settings.card-size-base') },
  { value: 'xl' as CardGridSize, label: t('deck-view.page-settings.card-size-full') }
]

const sort_options = [
  { value: 'default' as CardSortKey, label: t('deck-view.page-settings.sort-default') },
  { value: 'difficulty' as CardSortKey, label: t('deck-view.page-settings.sort-difficulty') }
]
</script>

<template>
  <div data-testid="page-settings-panel" class="flex w-full md:w-70 pb-8 flex-col gap-6">
    <header
      data-testid="page-settings-panel__header"
      class="grid w-full grid-cols-[1fr_auto_1fr] items-center"
    >
      <ui-button
        data-testid="page-settings-panel__close"
        icon-only
        icon-left="close"
        data-theme="brown-100"
        data-theme-dark="stone-700"
        :size="is_mobile ? 'base' : 'sm'"
        class="justify-self-start"
        @press="closePageSettings"
      >
        {{ t('deck-view.page-settings.close-button') }}
      </ui-button>

      <span
        data-testid="page-settings-panel__title"
        class="justify-self-center text-xl font-semibold text-brown-700 dark:text-brown-100"
      >
        {{ t('deck-view.page-settings.trigger') }}
      </span>
    </header>

    <div
      data-theme="blue-500"
      data-theme-dark="blue-650"
      data-testid="page-settings-panel__settings"
      class="mx-auto flex w-full max-w-70 md:max-w-60 flex-col gap-4"
    >
      <div data-testid="page-settings-panel__face" class="flex flex-col gap-2">
        <span class="text-sm text-brown-500 dark:text-brown-300">
          {{ t('deck-view.page-settings.face-label') }}
        </span>
        <ui-option-group
          full_width
          size="base"
          :options="face_options"
          :value="grid_face"
          @update:value="setGridFace"
        />
      </div>

      <div data-testid="page-settings-panel__card-size" class="flex flex-col gap-2">
        <span class="text-sm text-brown-500 dark:text-brown-300">
          {{ t('deck-view.page-settings.card-size-label') }}
        </span>
        <ui-option-group
          full_width
          size="base"
          :options="size_options"
          :value="grid_size"
          @update:value="setGridSize"
        />
      </div>

      <div data-testid="page-settings-panel__sort" class="flex flex-col gap-2">
        <span class="text-sm text-brown-500 dark:text-brown-300">
          {{ t('deck-view.page-settings.sort-label') }}
        </span>
        <ui-select-menu
          data-theme="brown-100"
          data-theme-dark="stone-700"
          trigger-theme="blue-500"
          trigger-theme-dark="blue-650"
          menu-theme-dark="stone-700"
          size="base"
          :options="sort_options"
          :model-value="sort_by"
          @update:model-value="setSortBy"
        />
      </div>
    </div>
  </div>
</template>
