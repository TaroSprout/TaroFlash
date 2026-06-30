<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useShortcuts } from '@/composables/shortcuts'
import { emitHoverSfx } from '@/sfx/bus'
import SettingsApp from '@/components/taro-phone/apps/settings-app.vue'
import DarkmodeApp from '@/components/taro-phone/apps/darkmode-app.vue'
import LogoutApp from '@/components/taro-phone/apps/logout-app.vue'

const { t } = useI18n()
const shortcuts = useShortcuts('phone/app-launcher')

let active_index = -1

shortcuts.register([
  { combo: 'arrowleft', handler: () => focusApp(active_index - 1) },
  { combo: 'arrowright', handler: () => focusApp(active_index + 1) },
  { combo: 'arrowup', handler: () => focusApp(active_index - 3) },
  { combo: 'arrowdown', handler: () => focusApp(active_index + 3) },
  { combo: 'enter', handler: activateFocused }
])

function focusApp(index: number, emit_hover_sfx = true) {
  const apps = _getApps()
  if (apps.length === 0) return

  if (index < 0) {
    active_index = apps.length - 1
  } else if (active_index === -1) {
    active_index = 0
  } else if (index >= apps.length) {
    active_index = 0
  } else {
    active_index = index
  }

  apps[active_index]?.focus()
  if (emit_hover_sfx) emitHoverSfx('pop_drip_mid')
}

function activateFocused() {
  _getApps()[active_index]?.click()
}

function onMouseOverApp(e: MouseEvent) {
  const target = (e.target as HTMLElement).closest<HTMLElement>('[data-testid="phone-app"]')
  if (!target) return

  const apps = _getApps()
  const index = apps.indexOf(target)
  if (index === active_index) return

  apps[active_index]?.blur()
  active_index = -1
  emitHoverSfx('pop_drip_mid')
}

function _getApps() {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-testid="phone-app"]'))
}
</script>

<template>
  <div
    data-testid="app-launcher"
    class="h-full flex flex-col gap-8.75 sm:gap-8 px-5 py-7 pt-4.5 sm:pt-4"
    @mouseover="onMouseOverApp"
  >
    <div class="grid grid-cols-[18px_1fr_18px] px-6 justify-center items-center">
      <h2 class="text-brown-500 text-lg sm:text-sm select-none col-start-2 justify-self-center">
        {{ t('phone.launcher.title') }}
      </h2>
    </div>

    <div
      class="w-full grid grid-cols-[auto_auto_auto] grid-rows-[auto_auto_auto] gap-2 justify-center content-center"
    >
      <settings-app />
      <darkmode-app />
      <logout-app />
    </div>
  </div>
</template>
