<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import MobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import Dropzone, { type FaceImage } from './dropzone.vue'

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024

export type { FaceImage }

export type CardImageTarget = 'cover' | 'faces'

export type CardImageUploadResponse =
  | { target: 'cover'; image: FaceImage }
  | { target: 'faces'; front: FaceImage; back: FaceImage }

type CardImageUploadProps = {
  close: (response?: CardImageUploadResponse) => void
  target: CardImageTarget
  max_bytes?: number
  front_image?: string
  back_image?: string
  cover_image?: string
}

const {
  close,
  target,
  max_bytes = DEFAULT_MAX_BYTES,
  front_image,
  back_image,
  cover_image
} = defineProps<CardImageUploadProps>()

const { t } = useI18n()

const front_result = ref<FaceImage>(undefined)
const back_result = ref<FaceImage>(undefined)
const cover_result = ref<FaceImage>(undefined)

const max_label = computed(() => `${+(max_bytes / 1024 / 1024).toFixed(1)} MB`)
const changed = computed(() => {
  if (target === 'cover') return cover_result.value !== undefined
  return front_result.value !== undefined || back_result.value !== undefined
})

function onConfirm() {
  if (target === 'cover') {
    close({ target: 'cover', image: cover_result.value })
    return
  }

  close({ target: 'faces', front: front_result.value, back: back_result.value })
}
</script>

<template>
  <mobile-sheet
    data-testid="card-image-upload-container"
    data-theme="brown-500"
    data-theme-dark="stone-700"
    class="sm:w-fit"
    @close="close()"
  >
    <div
      data-testid="card-image-upload__body"
      class="flex flex-col items-center gap-10 px-12 pt-16 pb-6"
    >
      <div data-testid="card-image-upload__picker" class="flex flex-col items-center gap-3">
        <div
          v-if="target === 'faces'"
          data-testid="card-image-upload__faces"
          class="flex flex-col gap-6 md:flex-row"
        >
          <div data-testid="card-image-upload__front" class="flex flex-col items-center gap-2">
            <p class="text-sm font-medium text-brown-500">
              {{ t('card-image-upload.front-label') }}
            </p>
            <dropzone v-model="front_result" :existing_image="front_image" :max_bytes="max_bytes" />
          </div>

          <div data-testid="card-image-upload__back" class="flex flex-col items-center gap-2">
            <p class="text-sm font-medium text-brown-500">
              {{ t('card-image-upload.back-label') }}
            </p>
            <dropzone v-model="back_result" :existing_image="back_image" :max_bytes="max_bytes" />
          </div>
        </div>

        <dropzone
          v-else
          v-model="cover_result"
          data-testid="card-image-upload__cover"
          :existing_image="cover_image"
          :max_bytes="max_bytes"
        />

        <i18n-t
          keypath="card-image-upload.restrictions"
          tag="p"
          data-testid="card-image-upload__restrictions"
          class="text-sm text-brown-500"
        >
          <template #format>
            <ui-tooltip
              element="span"
              :text="t('card-image-upload.formats-list')"
              position="bottom"
              :fallback_placements="['bottom', 'right', 'left']"
              :gap="4"
              class="text-blue-500 cursor-pointer"
              static_on_mobile
            >
              {{ t('card-image-upload.format-trigger') }}
            </ui-tooltip>
          </template>
          <template #max>{{ max_label }}</template>
        </i18n-t>
      </div>

      <div data-testid="card-image-upload__actions" class="flex w-full gap-3">
        <ui-button
          data-testid="card-image-upload__cancel"
          data-theme="brown-100"
          data-theme-dark="stone-700"
          icon-left="close"
          size="xl"
          full-width
          @click="close()"
        >
          {{ t('card-image-upload.cancel-button') }}
        </ui-button>

        <ui-button
          data-testid="card-image-upload__confirm"
          data-theme="blue-500"
          data-theme-dark="blue-650"
          icon-left="check"
          size="xl"
          full-width
          :disabled="!changed"
          @click="onConfirm"
        >
          {{ t('card-image-upload.confirm-button') }}
        </ui-button>
      </div>
    </div>
  </mobile-sheet>
</template>
