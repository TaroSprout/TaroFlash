import './styles/main.css'
import App from './App.vue'
import router from './router'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'
import { vSfx } from '@/sfx/directive'
import { warmupAnimations } from '@/utils/animations/warmup'

warmupAnimations()

window.addEventListener('vite:preloadError', () => {
  const reload_key = 'stale-chunk-reload'
  if (sessionStorage.getItem(reload_key)) return

  sessionStorage.setItem(reload_key, '1')
  window.location.reload()
})

const i18n = createI18n({
  locale: 'en-us',
  legacy: false,
  escapeParameter: false,
  messages
})

const app = createApp(App)

app.use(createPinia())
app.use(PiniaColada)
app.use(i18n)
app.use(router)

app.directive('sfx', vSfx)

app.mount('#app')

sessionStorage.removeItem('stale-chunk-reload')
