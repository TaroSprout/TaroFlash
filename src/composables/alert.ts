import { useModal } from './modal'
import { emitSfx } from '@/sfx/bus'
import alert, { type AlertType } from '@/components/ui-kit/alert.vue'
import { type NamespacedAudioKey } from '@/sfx/config'

type AlertArgs = {
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  backdrop?: boolean
  openAudio?: NamespacedAudioKey
  cancelAudio?: NamespacedAudioKey
  confirmAudio?: NamespacedAudioKey
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
      openAudio = 'ui.etc_woodblock_stuck',
      cancelAudio = 'ui.digi_powerdown',
      ...props
    } = args ?? {}

    emitSfx(openAudio)

    return modal.open(alert, {
      backdrop: backdrop ?? true,
      props: { type, cancelAudio, ...props }
    })
  }

  return { warn, info }
}
