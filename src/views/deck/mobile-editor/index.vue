<script setup lang="ts">
// imports
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import FaceEditor from '@/components/card/face-editor.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { mobileCardEditorKey } from './use-mobile-card-editor'

// composables + state
const { t } = useI18n()

const {
  side,
  current,
  index,
  cards,
  has_prev,
  has_next,
  card_attributes,
  saving,
  flip,
  prev,
  next,
  close,
  update
} = inject(mobileCardEditorKey)!

// computed
const placeholder = computed(() =>
  side.value === 'front'
    ? t('deck-view.mobile-editor.front-placeholder')
    : t('deck-view.mobile-editor.back-placeholder')
)

const position = computed(() => ({ index: index.value + 1, total: cards.value.length }))
</script>

<template>
  <div
    data-testid="mobile-card-editor"
    class="flex w-full flex-col items-center gap-4 px-(--dock-px) pt-(--dock-pt) pb-(--dock-pb)"
  >
    <div data-testid="mobile-card-editor__stage" class="flex w-full justify-center">
      <face-editor
        v-if="current"
        with_images
        :card="current"
        :side="side"
        :card_key="current.client_id"
        :card_attributes="card_attributes"
        :placeholder="placeholder"
        size="lg"
        input_testid="mobile-card-editor__input"
        @update="update"
      ></face-editor>
    </div>

    <div
      data-testid="mobile-card-editor__controls"
      class="flex w-full items-center justify-between gap-2"
    >
      <ui-button
        data-testid="mobile-card-editor__prev"
        icon-only
        icon-left="chevron-left"
        data-theme="brown-200"
        :disabled="!has_prev"
        :sfx="{ press: 'transition_down' }"
        @press="prev"
      >
        {{ t('deck-view.mobile-editor.prev-button') }}
      </ui-button>

      <ui-button
        data-testid="mobile-card-editor__flip"
        icon-left="card-flip"
        data-theme="brown-200"
        @press="flip"
      >
        {{ t('deck-view.mobile-editor.flip-button') }}
      </ui-button>

      <ui-button
        data-testid="mobile-card-editor__next"
        icon-only
        icon-left="chevron-right"
        data-theme="brown-200"
        :disabled="!has_next"
        :sfx="{ press: 'transition_up' }"
        @press="next"
      >
        {{ t('deck-view.mobile-editor.next-button') }}
      </ui-button>
    </div>

    <div
      data-testid="mobile-card-editor__status"
      class="flex w-full items-center justify-between text-base text-brown-500 dark:text-brown-100"
    >
      <span data-testid="mobile-card-editor__position">
        {{ t('deck-view.mobile-editor.position', position) }}
      </span>

      <span v-if="saving" data-testid="mobile-card-editor__saving">
        {{ t('deck-view.mobile-editor.saving') }}
      </span>

      <ui-button
        data-testid="mobile-card-editor__done"
        icon-left="check"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        @press="close"
      >
        {{ t('deck-view.mobile-editor.done-button') }}
      </ui-button>
    </div>
  </div>
</template>
