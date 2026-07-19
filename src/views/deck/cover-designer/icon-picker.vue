<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'
import UiIcon from '@/components/ui-kit/icon.vue'

const { t } = useI18n()

type IconPickerProps = {
  supported_icons: string[]
  icon: string | undefined
}

const { icon } = defineProps<IconPickerProps>()

const emit = defineEmits<{
  (e: 'update:icon', icon: string | undefined): void
}>()

function onIconSelect(value: string | undefined) {
  if (value === icon) {
    emitSfx('digi_powerdown')
    return
  }

  emitSfx('toggle_on')
  emit('update:icon', value)
}
</script>

<template>
  <div data-testid="icon-picker-container" class="flex flex-col gap-2.5">
    <h3 data-testid="icon-picker__label" class="text-ink">
      {{ t('deck.settings-modal.cover.icon-picker.label') }}
    </h3>
    <div data-testid="icon-picker" class="flex flex-wrap gap-2">
      <button
        v-for="name in supported_icons"
        :key="name"
        :data-testid="`icon-picker__option-${name}`"
        :data-selected="name === icon || undefined"
        v-sfx="{ hover: TYPE_SFX }"
        class="w-14.5 aspect-square rounded-6 cursor-pointer flex items-center justify-center bg-brown-100 dark:bg-stone-700 text-ink-muted [&_svg]:size-6 data-selected:bg-(--theme-primary) data-selected:text-(--theme-accent) hover:bg-(--theme-primary) hover:text-(--theme-accent) hover:bgx-diagonal-stripes hover:bgx-opacity-10 data-selected:bgx-diagonal-stripes data-selected:bgx-opacity-10 transition-colors duration-75 hover:[&_svg]:scale-120 hover:[&_svg]:rotate-6"
        @click="onIconSelect(name)"
      >
        <ui-icon :src="name" />
      </button>
    </div>
  </div>
</template>
