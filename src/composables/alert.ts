import { useModal } from './modal'
import { emitSfx } from '@/sfx/bus'
import alert, { type AlertType } from '@/components/ui-kit/alert.vue'
import { type SoundKey } from '@/sfx/config'

type AlertArgs = {
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  backdrop?: boolean
  openAudio?: SoundKey
  cancelAudio?: SoundKey
  confirmAudio?: SoundKey
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
      openAudio = 'etc_woodblock_stuck',
      cancelAudio = 'digi_powerdown',
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
