import { useOverlay } from '@/composables/overlay/use-overlay'
import { useTracking } from '@/composables/tracking'
import SignupDialog from './index.vue'

/** Opens the sign-up modal as a mobile sheet on small viewports. */
export function useSignupModal() {
  const { open } = useOverlay()
  const tracking = useTracking()

  /** @param payment - preselect the paid plan when the user came from a pricing CTA. */
  function open_signup(payment?: boolean) {
    tracking.trackSignupStarted()

    return open<boolean>(SignupDialog, {
      props: { payment },
      presentation: 'dialog',
      open_sfx: 'dialog.open',
      close_sfx: 'dialog.close'
    })
  }

  return { open: open_signup }
}
