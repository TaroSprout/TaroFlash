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
  palette: IdentityName
}

const { t } = useI18n()
const theme_store = useThemeStore()
const { mode } = storeToRefs(theme_store)
const { cycle } = theme_store

const modes = computed<{ [key in ThemeMode]: ModeConfig }>(() => ({
  system: { labelKey: 'phone.apps.darkmode.mode-system', palette: 'purple' },
  light: { labelKey: 'phone.apps.darkmode.mode-light', palette: 'orange' },
  dark: { labelKey: 'phone.apps.darkmode.mode-dark', palette: 'blue' }
}))

const active_mode_config = computed(() => modes.value[mode.value])
const palette = computed(() => active_mode_config.value.palette)
const title = computed(() => t(active_mode_config.value.labelKey))

function cycleMode() {
  cycle()
  emitSfx('select')
}
</script>

<template>
  <app-shell
    :data-palette="palette"
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
