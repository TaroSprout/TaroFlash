import type { TriggerApp } from '@/phone/system/types'
import type { ComposerTranslation } from 'vue-i18n'
import { createLogoutController } from './controller'

export function logoutApp(t: ComposerTranslation): TriggerApp {
  const { onTrigger } = createLogoutController(t)
  return {
    id: 'logout',
    title: 'Logout',
    type: 'trigger',
    onTrigger,
    launcher: {
      icon_src: 'logout',
      hover_icon_src: 'logout-hover',
      theme: 'red-400'
    }
  }
}
