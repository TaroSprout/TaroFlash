<script setup lang="ts">
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'
import UiIcon from '@/components/ui-kit/icon.vue'

type ThemePickerProps = {
  label: string
  supported_palettes: PaletteName[]
  palette: PaletteName | undefined
}

const { palette } = defineProps<ThemePickerProps>()

const emit = defineEmits<{
  (e: 'update:palette', value: PaletteName | undefined): void
}>()

function isSelected(option: PaletteName) {
  return option === palette
}

function onThemeSelect(option: PaletteName) {
  if (isSelected(option)) {
    emitSfx('digi_powerdown')
    return
  }

  emitSfx('toggle_on')
  emit('update:palette', option)
}
</script>

<template>
  <div data-testid="theme-picker-container" class="flex flex-col gap-2.5">
    <h3 data-testid="theme-picker__label" class="text-ink">
      {{ label }}
    </h3>
    <div data-testid="theme-picker" class="w-full flex flex-wrap gap-3">
      <button
        v-for="option in supported_palettes"
        :key="option"
        :data-testid="`theme-picker__option-${option}`"
        :data-palette="option"
        v-sfx="{ hover: TYPE_SFX }"
        class="w-9 shrink-0 aspect-square bg-(--color-accent) rounded-8 rounded-tr-3 cursor-pointer relative! hover:outline-5 outline-white"
        :class="{ 'outline-5 outline-white': isSelected(option) }"
        @click="onThemeSelect(option)"
      >
        <div
          v-if="isSelected(option)"
          class="absolute -top-2 -right-2 bg-white p-1.5 size-6.5 rounded-full flex items-center justify-center"
        >
          <ui-icon src="check" class="text-(--color-accent)" />
        </div>
      </button>
    </div>
  </div>
</template>
