import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'

const LoginSheet = defineAsyncComponent(() => import('./sheet.vue'))

/** Opens the login dialog as a mobile sheet on small viewports. */
export function useLoginModal() {
  const modal = useModal()

  function open() {
    emitSfx('snappy_button_3')
    const result = modal.open<boolean>(LoginSheet, {
      backdrop: true,
      mode: 'mobile-sheet',
      mobile_below_width: 'md'
    })
    result.response.then(() => emitSfx('snappy_button_5'))
    return result
  }

  return { open }
}
