import { useOverlay } from '@/composables/overlay/use-overlay'
import SignupDialog from './index.vue'

/** Opens the sign-up modal as a mobile sheet on small viewports. */
export function useSignupModal() {
  const { open } = useOverlay()

  /** @param payment - preselect the paid plan when the user came from a pricing CTA. */
  function open_signup(payment?: boolean) {
    return open<boolean>(SignupDialog, {
      props: { payment },
      presentation: 'dialog',
      open_sfx: 'snappy_button_3',
      close_sfx: 'pop_up_close'
    })
  }

  return { open: open_signup }
}
