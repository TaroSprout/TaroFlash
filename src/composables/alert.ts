import { useOverlay } from '@/composables/overlay/use-overlay'
import alert, { type AlertType } from '@/components/ui-kit/alert.vue'
import { type SoundKey } from '@/sfx/config'

type AlertArgs = {
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  openAudio?: SoundKey
  cancelAudio?: SoundKey
  confirmAudio?: SoundKey
}

/**
 * Confirm/cancel prompt opened on the overlay stack. `warn` and `info` both
 * resolve `response` to the user's choice — `true` on confirm, `false` (or
 * `undefined`) on cancel/dismiss.
 *
 * @example
 * if (await useAlert().warn({ title: t('...') }).response) { ... }
 */
export function useAlert() {
  const { open } = useOverlay()

  function warn(args?: AlertArgs) {
    return _openAlert('warn', args)
  }

  function info(args?: AlertArgs) {
    return _openAlert('info', args)
  }

  function _openAlert(type: AlertType, args?: AlertArgs) {
    const {
      openAudio = 'etc_woodblock_stuck',
      cancelAudio = 'digi_powerdown',
      ...props
    } = args ?? {}

    const { result, close } = open<boolean>(alert, {
      presentation: 'popup',
      open_sfx: openAudio,
      props: { type, cancelAudio, ...props }
    })

    return { response: result, close }
  }

  return { warn, info }
}
