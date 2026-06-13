<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/card/index.vue'
import LayoutSkeleton from './layout-skeleton.vue'
import { CARD_ATTRIBUTES_DEFAULTS } from '@/utils/deck/defaults'
import { emitSfx } from '@/sfx/bus'

const layout = defineModel<CardImageLayout | undefined>('layout')

const { t } = useI18n()

const LAYOUTS: CardImageLayout[] = ['above', 'below', 'behind']

const selected = computed(() => layout.value ?? CARD_ATTRIBUTES_DEFAULTS.image_layout)

function onSelect(value: CardImageLayout) {
  if (selected.value === value) {
    emitSfx('ui.digi_powerdown')
    return
  }

  emitSfx('ui.select')
  layout.value = value
}
</script>

<template>
  <div data-testid="image-layout-picker" class="flex w-full justify-center gap-1">
    <button
      v-for="option in LAYOUTS"
      :key="option"
      type="button"
      :data-testid="`image-layout-picker__option-${option}`"
      :data-active="selected === option"
      class="group relative flex cursor-pointer flex-col items-center gap-2 rounded-8 p-2 transition-colors hover:bg-brown-500 dark:hover:bg-grey-700 hover:bgx-diagonal-stripes hover:bgx-opacity-10 data-[active=true]:bg-(--theme-primary) data-[active=true]:bgx-diagonal-stripes data-[active=true]:bgx-opacity-10"
      @click="onSelect(option)"
      v-sfx="{ hover: selected === option ? undefined : 'ui.click_07' }"
    >
      <card size="xs" side="front">
        <template #front>
          <layout-skeleton :layout="option" />
        </template>
      </card>

      <span
        data-testid="image-layout-picker__label"
        class="text-sm text-brown-700 group-hover:text-(--theme-on-primary) group-data-[active=true]:text-(--theme-on-primary) dark:text-brown-100"
      >
        {{ t(`deck.settings-modal.design.card-designer.image-layout.option-${option}`) }}
      </span>
    </button>
  </div>
</template>
