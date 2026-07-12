import './styles/main.css'
import App from './App.vue'
import router from './router'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada, PiniaColadaQueryHooksPlugin } from '@pinia/colada'
import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'
import { vSfx } from '@/sfx/directive'
import { warmupAnimations } from '@/utils/animations/warmup'
import { useSessionStore } from '@/stores/session'

warmupAnimations()

// The router's own scrollBehavior (savedPosition ?? {top: 0}) only runs on
// client-side navigations — a hard refresh bypasses it entirely and falls to
// the browser's native restoration, which tries to replay the last scrollY
// for this URL. Dashboard content height is query-loaded and genuinely
// changes during boot, so a native restore against a transient or
// previously-taller page gets clamped to the bottom once layout settles.
// Disabling it makes a refresh always start at the top, matching what the
// route-level fallback already assumes.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

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
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.use(router)

// Deferred to call-time: the store's own setup() calls useI18n()/useRouter(),
// which only work while a component is being set up. Resolving it here would
// create the store before any component exists. By the time a query/mutation
// actually errors, the router guard has already triggered its first (and
// only) real construction, so this just looks up the cached instance.
function handleAuthError(error: unknown) {
  useSessionStore(pinia).handleAuthError(error)
}

app.use(PiniaColada, {
  plugins: [PiniaColadaQueryHooksPlugin({ onError: handleAuthError })],
  mutationOptions: { onError: handleAuthError }
})

app.directive('sfx', vSfx)

app.mount('#app')

sessionStorage.removeItem('stale-chunk-reload')
