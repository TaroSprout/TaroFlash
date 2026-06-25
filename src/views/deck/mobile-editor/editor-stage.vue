<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import FaceEditor from '@/components/card/face-editor.vue'
import { mobileCardEditorKey } from './use-mobile-card-editor'

const { t } = useI18n()

const { current, side, card_attributes, update } = inject(mobileCardEditorKey)!

const placeholder = computed(() =>
  side.value === 'front'
    ? t('deck-view.mobile-editor.front-placeholder')
    : t('deck-view.mobile-editor.back-placeholder')
)
</script>

<template>
  <div data-testid="mobile-card-editor__stage" class="flex w-full justify-center">
    <face-editor
      v-if="current"
      with_images
      :card="current"
      :side="side"
      :card_key="current.client_id"
      :card_attributes="card_attributes"
      :placeholder="placeholder"
      size="xl"
      input_testid="mobile-card-editor__input"
      @update="update"
    ></face-editor>
  </div>
</template>
