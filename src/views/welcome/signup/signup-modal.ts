import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import { useTracking } from '@/composables/tracking'
import SignupDialog from './index.vue'

/** Opens the sign-up modal as a mobile sheet on small viewports. */
export function useSignupModal() {
  const modal = useModal()
  const tracking = useTracking()

  /** @param payment - preselect the paid plan when the user came from a pricing CTA. */
  function open(payment?: boolean) {
    emitSfx('dialog.open')
    tracking.trackSignupStarted()
    const result = modal.open<boolean>(SignupDialog, {
      backdrop: true,
      mode: 'mobile-sheet',
      mobile_below_width: 'sm',
      mobile_below_height: 'md',
      props: { payment }
    })
    result.response.then(() => emitSfx('dialog.close'))
    return result
  }

  return { open }
}
