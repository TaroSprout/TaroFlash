import { useModal } from './modal'
import { emitSfx } from '@/sfx/bus'
import prompt from '@/components/ui-kit/prompt.vue'
import type { SfxRole } from '@/sfx/roles'

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
  openAudio?: SfxRole
  cancelAudio?: SfxRole
  confirmAudio?: SfxRole
}

/**
 * Single-text-field counterpart to {@link useAlert} — for actions that need a
 * name before they can run (naming a new preset, renaming an existing one).
 *
 * `response` resolves to the trimmed string, or `undefined` when cancelled or
 * dismissed. The modal blocks confirm on an empty value, so a resolved string
 * is always non-empty.
 */
export function usePrompt() {
  const modal = useModal()

  function ask(args: PromptArgs) {
    const { backdrop, openAudio = 'notice.error', cancelAudio = 'dialog.dismiss', ...props } = args

    emitSfx(openAudio)

    return modal.open<string>(prompt, {
      mode: 'popup',
      backdrop: backdrop ?? true,
      props: { cancelAudio, ...props }
    })
  }

  return { ask }
}
