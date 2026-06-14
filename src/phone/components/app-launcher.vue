<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'
import ViewApp from '@/phone/components/view-app.vue'
import { type PhoneApp, type AppContextInjection, APP_CTX_KEY } from '@/phone/system/types'
import { useShortcuts } from '@/composables/shortcuts'
import { emitHoverSfx, emitSfx } from '@/sfx/bus'

const { apps } = defineProps<{
  apps: PhoneApp[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const shortcuts = useShortcuts('phone/app-launcher')

const phone = inject<AppContextInjection>(APP_CTX_KEY)!
const active_app = ref(-1)

shortcuts.register([
  {
    combo: 'arrowleft',
    handler: () => focusApp(active_app.value - 1)
  },
  {
    combo: 'arrowright',
    handler: () => focusApp(active_app.value + 1)
  },
  {
    combo: 'arrowup',
    handler: () => focusApp(active_app.value - 3)
  },
  {
    combo: 'arrowdown',
    handler: () => focusApp(active_app.value + 3)
  },
  {
    combo: 'enter',
    handler: () => {
      const app = apps[active_app.value]
      if (app) onTapApp(app)
      openApp()
    }
  }
])

onMounted(() => {
  if (active_app.value !== -1) {
    focusApp(active_app.value, false)
  }
})

function focusApp(index: number, emit_hover_sfx = true) {
  if (index < 0) {
    active_app.value = apps.length - 1 // start from end
  } else if (active_app.value === -1) {
    active_app.value = 0 // start from beginning
  } else if (index >= apps.length) {
    active_app.value = 0 // wrap to beginning
  } else {
    active_app.value = index
  }

  const app = _getActiveApp()
  app?.focus()

  if (emit_hover_sfx) _playHoverSfx()
}

function openApp(app?: PhoneApp) {
  const found = app ?? apps[active_app.value]
  if (!found || !phone) return

  active_app.value = apps.indexOf(found)

  if (found.type === 'widget') return

  phone.open(found.id)
}

function onTapApp(app: PhoneApp) {
  if (app.type === 'view') emitSfx('ui.toggle_on')
}

// If the hovered app is not the active app,
// blur the active app and reset the active app index
function onHoverApp(app: PhoneApp) {
  const index = apps.indexOf(app)
  if (index === active_app.value) return

  const found = _getActiveApp()
  active_app.value = -1
  found?.blur()

  _playHoverSfx()
}

function _playHoverSfx() {
  emitHoverSfx('ui.pop_drip_mid')
}

function _getActiveApp() {
  return document.querySelectorAll('[data-testid="phone-app"]')[active_app.value] as HTMLElement
}
</script>

<template>
  <div
    data-testid="app-launcher"
    class="h-full flex flex-col gap-8.75 sm:gap-8 px-5 py-7 pt-4.5 sm:pt-4"
  >
    <div class="grid grid-cols-[18px_1fr_18px] px-6 justify-center items-center">
      <h2 class="text-brown-500 text-lg sm:text-sm select-none col-start-2 justify-self-center">
        TaroPhone
      </h2>
    </div>

    <div
      class="w-full grid grid-cols-[auto_auto_auto] grid-rows-[auto_auto_auto] gap-2 justify-center content-center"
    >
      <template v-for="app in apps">
        <view-app
          v-if="app.type === 'view' || app.type === 'trigger'"
          :id="app.id"
          :key="app.id"
          :app="app"
          @click="openApp(app)"
          @tap-start="onTapApp(app)"
          @mouseenter="onHoverApp(app)"
        />

        <component
          v-else-if="app.type === 'widget'"
          :is="app.component"
          @mouseenter="onHoverApp(app)"
          @click="openApp(app)"
        />
      </template>
    </div>
  </div>
</template>
