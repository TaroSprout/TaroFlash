import { useOverlay } from '@/composables/overlay/use-overlay'
import LoginSheet from './sheet.vue'

/** Opens the login dialog as a mobile sheet on small viewports. */
export function useLoginModal() {
  const { open } = useOverlay()

  function open_login() {
    return open<boolean>(LoginSheet, {
      presentation: 'dialog',
      open_sfx: 'dialog.open',
      close_sfx: 'dialog.close'
    })
  }

  return { open: open_login }
}
