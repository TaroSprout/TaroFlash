<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'
import AlignPicker from './align-picker.vue'
import ImageLayoutPicker from './image-layout-picker.vue'
import { CARD_ATTRIBUTES_DEFAULTS } from '@/utils/deck/defaults'
import { useCan } from '@/composables/can'
import { emitSfx } from '@/sfx/bus'

type CardDesignerProps = {
  attributes: CardAttributes
}

const { attributes } = defineProps<CardDesignerProps>()

const { t } = useI18n()
const can = useCan()

const text_size = computed({
  get: () =>
    typeof attributes.text_size === 'number'
      ? attributes.text_size
      : CARD_ATTRIBUTES_DEFAULTS.text_size,
  set: (value: number) => {
    attributes.text_size = value
    emitSfx('select')
  }
})
</script>

<template>
  <div
    data-testid="card-designer"
    class="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-3 w-full"
  >
    <span
      data-testid="card-designer__text-size-label"
      class="self-center text-brown-700 dark:text-brown-100"
    >
      {{ t('deck.settings-modal.design.card-designer.text-size-label') }}
    </span>
    <ui-spinbox
      data-testid="card-designer__text-size-spinbox"
      v-model:value="text_size"
      :min="1"
      :max="10"
      :step="1"
    />

    <span data-testid="card-designer__alignment-label" class="text-brown-700 dark:text-brown-100">
      {{ t('deck.settings-modal.design.card-designer.alignment-label') }}
    </span>
    <align-picker
      v-model:horizontal="attributes.horizontal_alignment"
      v-model:vertical="attributes.vertical_alignment"
    />

    <div v-if="can.useCardImages.value" class="col-span-2 flex flex-col gap-2.5">
      <span
        data-testid="card-designer__image-layout-label"
        class="text-brown-700 dark:text-brown-100"
      >
        {{ t('deck.settings-modal.design.card-designer.image-layout-label') }}
      </span>
      <image-layout-picker v-model:layout="attributes.image_layout" />
    </div>
  </div>
</template>
