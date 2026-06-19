import { markRaw } from 'vue'
import type { ComposerTranslation } from 'vue-i18n'
import type { PhoneApp } from '@/phone/system/types'
import settings from './settings/_manifest'
import darkmode from './darkmode/_manifest'
import { logoutApp } from './logout/_manifest'
import shortcuts from './shortcuts/_manifest'
import feedback from './feedback/_manifest'
import inventory from './inventory/_manifest'

export function buildPhoneApps(t: ComposerTranslation): PhoneApp[] {
  return [
    markRaw(settings) as PhoneApp,
    markRaw(darkmode) as PhoneApp,
    markRaw(logoutApp(t)) as PhoneApp,
    markRaw(shortcuts) as PhoneApp,
    markRaw(feedback) as PhoneApp,
    markRaw(inventory) as PhoneApp
  ]
}
