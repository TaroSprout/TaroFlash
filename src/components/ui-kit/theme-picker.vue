<script setup lang="ts">
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'
import UiIcon from '@/components/ui-kit/icon.vue'

type ThemePickerProps = {
  label: string
  supported_themes: DeckTheme[]
  theme: Theme | undefined
  theme_dark: Theme | undefined
}

const { theme, theme_dark } = defineProps<ThemePickerProps>()

const emit = defineEmits<{
  (e: 'update:theme', value: Theme | undefined): void
  (e: 'update:theme_dark', value: Theme | undefined): void
}>()

function isSelected(option: DeckTheme) {
  return option.light === theme && (option.dark ?? null) === (theme_dark ?? null)
}

function onThemeSelect(option: DeckTheme) {
  if (isSelected(option)) {
    emitSfx('ui.digi_powerdown')
    return
  }

  emitSfx('ui.toggle_on')
  emit('update:theme', option.light)
  emit('update:theme_dark', option.dark)
}
</script>

<template>
  <div data-testid="theme-picker-container" class="flex flex-col gap-2.5">
    <h3 data-testid="theme-picker__label" class="text-brown-700 dark:text-brown-100">
      {{ label }}
    </h3>
    <div data-testid="theme-picker" class="w-full flex flex-wrap gap-3">
      <button
        v-for="option in supported_themes"
        :key="`${option.light}:${option.dark ?? option.light}`"
        :data-testid="`theme-picker__option-${option.light}`"
        :data-theme="option.light"
        :data-theme-dark="option.dark"
        v-sfx="{ hover: TYPE_SFX }"
        class="w-9 shrink-0 aspect-square bg-(--theme-primary) rounded-8 rounded-tr-3 cursor-pointer relative! hover:outline-5 outline-white"
        :class="{ 'outline-5 outline-white': isSelected(option) }"
        @click="onThemeSelect(option)"
      >
        <div
          v-if="isSelected(option)"
          class="absolute -top-2 -right-2 bg-white p-1.5 size-6.5 rounded-full flex items-center justify-center"
        >
          <ui-icon src="check" class="text-(--theme-primary)" />
        </div>
      </button>
    </div>
  </div>
</template>
