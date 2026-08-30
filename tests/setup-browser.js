import { config } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'

const i18n = createI18n({
  locale: 'en-us',
  legacy: false,
  messages
})

config.global.plugins = [i18n]

// The sound directive is registered on the real app (src/main.ts) but not in
// this setup. Register a no-op default so a real "Failed to resolve
// directive: sfx" warning stands out instead of being lost in the noise; a
// test exercising real sound behaviour overrides this per-mount with the
// real vSfx via `global.directives`.
config.global.directives = { sfx: {} }
