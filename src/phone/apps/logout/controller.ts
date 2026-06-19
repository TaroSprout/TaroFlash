import type { ComposerTranslation } from 'vue-i18n'
import { useAlert } from '@/composables/alert'
import { useSessionStore } from '@/stores/session'

export function createLogoutController(t: ComposerTranslation) {
  function onTrigger() {
    const alert = useAlert()
    const session = useSessionStore()
    const { response } = alert.warn({
      title: t('phone.apps.logout.title'),
      message: t('phone.apps.logout.description'),
      confirmLabel: t('phone.apps.logout.confirm'),
      cancelAudio: 'ui.digi_powerdown',
      confirmAudio: 'ui.toggle_off'
    })

    response.then((result) => {
      if (result) session.logout()
    })
  }

  return { onTrigger }
}
