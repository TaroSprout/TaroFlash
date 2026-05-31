<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import MobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import { bytesToMbLabel } from '@/utils/file-size'
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

const results = reactive<Record<'front' | 'back' | 'cover', FaceImage>>({
  front: undefined,
  back: undefined,
  cover: undefined
})

const faces = computed(() => [
  { key: 'front' as const, label: 'card-image-upload-modal.front-label', image: front_image },
  { key: 'back' as const, label: 'card-image-upload-modal.back-label', image: back_image }
])
const max_label = computed(() => bytesToMbLabel(max_bytes))
const changed = computed(() => {
  if (target === 'cover') return results.cover !== undefined
  return results.front !== undefined || results.back !== undefined
})

function onConfirm() {
  if (target === 'cover') {
    close({ target: 'cover', image: results.cover })
    return
  }

  close({ target: 'faces', front: results.front, back: results.back })
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
          <div
            v-for="face in faces"
            :key="face.key"
            :data-testid="`card-image-upload__${face.key}`"
            class="flex flex-col items-center gap-2"
          >
            <p class="text-sm font-medium text-brown-500">{{ t(face.label) }}</p>
            <dropzone
              v-model="results[face.key]"
              :existing_image="face.image"
              :max_bytes="max_bytes"
            />
          </div>
        </div>

        <div v-else data-testid="card-image-upload__cover">
          <dropzone v-model="results.cover" :existing_image="cover_image" :max_bytes="max_bytes" />
        </div>

        <i18n-t
          keypath="card-image-upload-modal.restrictions"
          tag="p"
          data-testid="card-image-upload__restrictions"
          class="text-sm text-brown-500"
        >
          <template #format>
            <ui-tooltip
              element="span"
              :text="t('card-image-upload-modal.formats-list')"
              position="bottom"
              :fallback_placements="['bottom', 'right', 'left']"
              :gap="4"
              class="text-blue-500 cursor-pointer"
              static_on_mobile
            >
              {{ t('card-image-upload-modal.format-trigger') }}
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
          {{ t('card-image-upload-modal.cancel-button') }}
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
          {{ t('card-image-upload-modal.confirm-button') }}
        </ui-button>
      </div>
    </div>
  </mobile-sheet>
</template>
