<script setup lang="ts">
import UiImage from '@/components/ui-kit/image.vue'
import Widget from '@/phone/components/widget.vue'
import { computed } from 'vue'
import { useThemeStore, type ThemeMode } from '@/stores/theme'
import { storeToRefs } from 'pinia'
import { emitSfx } from '@/sfx/bus'

type ModeConfig = {
  label: string
  theme: Theme
}

const theme_store = useThemeStore()
const { mode } = storeToRefs(theme_store)
const { cycle } = theme_store

const modes = computed<{ [key in ThemeMode]: ModeConfig }>(() => ({
  system: { label: 'System', theme: 'purple-500' },
  light: { label: 'Lightmode', theme: 'yellow-600' },
  dark: { label: 'Darkmode', theme: 'blue-650' }
}))

const active_mode_config = computed(() => modes.value[mode.value])
const theme = computed(() => active_mode_config.value.theme)
const title = computed(() => `${active_mode_config.value.label}`)

function cycleMode() {
  cycle()
  emitSfx('select')
}
</script>

<template>
  <widget :theme="theme" :title="title" tap-burst="base" instant-action @press="cycleMode">
    <ui-image v-if="mode === 'system'" src="darkmode-system" />
    <ui-image v-else-if="mode === 'light'" src="darkmode-light" />
    <ui-image v-else src="darkmode-dark" />
  </widget>
</template>
