<script setup lang="ts">
import { computed, inject, useTemplateRef, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import FaceEditor from '@/components/card/face-editor.vue'
import { mobileCardEditorKey } from './use-mobile-card-editor'

const { t } = useI18n()

const { current, side, card_attributes, update, image_controls } = inject(mobileCardEditorKey)!

const face = useTemplateRef('face')

const placeholder = computed(() =>
  side.value === 'front'
    ? t('deck-view.mobile-editor.front-placeholder')
    : t('deck-view.mobile-editor.back-placeholder')
)

// Publish the active face's uploader controls so the header menu can drive
// add/remove; null whenever there's no mounted image layer.
watchEffect(() => {
  const uploader = face.value?.uploader
  image_controls.value = uploader
    ? { openPicker: uploader.openPicker, onRemove: uploader.onRemove }
    : null
})
</script>

<template>
  <div data-testid="mobile-card-editor__stage" class="flex w-full justify-center px-(--dialog-px)">
    <face-editor
      v-if="current"
      ref="face"
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
