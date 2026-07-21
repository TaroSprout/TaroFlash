import { useOverlay } from '@/composables/overlay/use-overlay'
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
  const { open } = useOverlay()

  function ask(args: PromptArgs) {
    const { openAudio = 'etc_woodblock_stuck', cancelAudio = 'digi_powerdown', ...props } = args

    const { result } = open<string>(prompt, {
      presentation: 'popup',
      open_sfx: openAudio,
      props: { cancelAudio, ...props }
    })

    return { response: result }
  }

  return { ask }
}
