import { beforeEach } from 'vite-plus/test'
import { config } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'
import { makeOverlayContext, OVERLAY_CONTEXT_KEY } from '@tests/fixtures/overlay'

const i18n = createI18n({
  locale: 'en-us',
  legacy: false,
  messages
})

config.global.plugins = [i18n]

// A no-op default, so a real unresolved-directive warning stands out; tests exercising sound pass the real one.
config.global.directives = { sfx: {} }

// A default stand-in overlay context, so a surface (app-window, dialog-card, paged-window, …)
// mounted directly — without a real overlay host — still injects. A test asserting on the
// context itself (close/dismiss spies, veto registration) still overrides this per-mount via
// `global: { provide: { [OVERLAY_CONTEXT_KEY]: makeOverlayContext(overrides) } }`. Rebuilt every
// test so the default's spies never accumulate calls across tests sharing this file.
beforeEach(() => {
  config.global.provide = { [OVERLAY_CONTEXT_KEY]: makeOverlayContext() }
})
