import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'

const SignupDialog = defineAsyncComponent(() => import('./index.vue'))

/** Opens the sign-up modal as a mobile sheet on small viewports. */
export function useSignupModal() {
  const modal = useModal()

  /** @param payment - preselect the paid plan when the user came from a pricing CTA. */
  function open(payment?: boolean) {
    emitSfx('snappy_button_3')
    const result = modal.open<boolean>(SignupDialog, {
      backdrop: true,
      mode: 'mobile-sheet',
      mobile_below_width: 'md',
      props: { payment }
    })
    result.response.then(() => emitSfx('snappy_button_5'))
    return result
  }

  return { open }
}
