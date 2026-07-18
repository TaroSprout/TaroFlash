import { useModal } from './modal'
import { emitSfx } from '@/sfx/bus'
import prompt from '@/components/ui-kit/prompt.vue'
import { type SoundKey } from '@/sfx/config'

type PromptArgs = {
  title: string
  message?: string
  label?: string
  placeholder?: string
  initialValue?: string
  confirmLabel: string
  cancelLabel?: string
  maxLength?: number
  backdrop?: boolean
  openAudio?: SoundKey
  cancelAudio?: SoundKey
  confirmAudio?: SoundKey
}

/**
 * Single-text-field counterpart to {@link useAlert} — for actions that need a
 * name before they can run (naming a new preset, renaming an existing one).
 *
 * `response` resolves to the trimmed string, or `undefined` when cancelled or
 * dismissed. The modal blocks confirm on an empty value, so a resolved string
 * is always non-empty.
 *
 * @example
 * const name = await usePrompt().ask({
 *   title: t('...'),
 *   confirmLabel: t('...')
 * }).response
 * if (!name) return
 */
export function usePrompt() {
  const modal = useModal()

  function ask(args: PromptArgs) {
    const {
      backdrop,
      openAudio = 'etc_woodblock_stuck',
      cancelAudio = 'digi_powerdown',
      ...props
    } = args

    emitSfx(openAudio)

    return modal.open<string>(prompt, {
      mode: 'popup',
      backdrop: backdrop ?? true,
      props: { cancelAudio, ...props }
    })
  }

  return { ask }
}
