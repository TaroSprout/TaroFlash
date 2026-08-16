import { useModal } from './modal'
import { emitSfx } from '@/sfx/bus'
import alert, { type AlertType } from '@/components/ui-kit/alert.vue'
import type { SfxRole } from '@/sfx/roles'

type AlertArgs = {
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  backdrop?: boolean
  openAudio?: SfxRole
  cancelAudio?: SfxRole
  confirmAudio?: SfxRole
}

export function useAlert() {
  const modal = useModal()

  function warn(args?: AlertArgs) {
    return _openAlert('warn', args)
  }

  function info(args?: AlertArgs) {
    return _openAlert('info', args)
  }

  function _openAlert(type: AlertType, args?: AlertArgs) {
    const {
      backdrop,
      openAudio = 'notice.error',
      cancelAudio = 'dialog.dismiss',
      ...props
    } = args ?? {}

    emitSfx(openAudio)

    return modal.open(alert, {
      mode: 'popup',
      backdrop: backdrop ?? true,
      props: { type, cancelAudio, ...props }
    })
  }

  return { warn, info }
}
