import { config } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'

const i18n = createI18n({
  locale: 'en-us',
  legacy: false,
  messages
})

config.global.plugins = [i18n]

// A no-op default, so a real unresolved-directive warning stands out; tests exercising sound pass the real one.
config.global.directives = { sfx: {} }
