<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import UiImage from '@/components/ui-kit/image.vue'
import AppShell from '@/components/taro-phone/app-shell.vue'
import { useThemeStore, type ThemeMode } from '@/stores/theme'
import { emitSfx } from '@/sfx/bus'

type ModeConfig = {
  labelKey: string
  theme: Theme
}

const { t } = useI18n()
const theme_store = useThemeStore()
const { mode } = storeToRefs(theme_store)
const { cycle } = theme_store

const modes = computed<{ [key in ThemeMode]: ModeConfig }>(() => ({
  system: { labelKey: 'phone.apps.darkmode.mode-system', theme: 'purple-500' },
  light: { labelKey: 'phone.apps.darkmode.mode-light', theme: 'orange-500' },
  dark: { labelKey: 'phone.apps.darkmode.mode-dark', theme: 'blue-650' }
}))

const active_mode_config = computed(() => modes.value[mode.value])
const theme = computed(() => active_mode_config.value.theme)
const title = computed(() => t(active_mode_config.value.labelKey))

function cycleMode() {
  cycle()
  emitSfx('select')
}
</script>

<template>
  <app-shell
    :data-theme="theme"
    :title="title"
    :tap-hold="0"
    :tap-duration="0.2"
    instant-action
    @press="cycleMode"
  >
    <ui-image v-if="mode === 'system'" src="darkmode-system" />
    <ui-image v-else-if="mode === 'light'" src="darkmode-light" />
    <ui-image v-else src="darkmode-dark" />
  </app-shell>
</template>
