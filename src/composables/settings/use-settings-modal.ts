import { useOverlay } from '@/composables/overlay/use-overlay'
import SettingsComponent from '@/views/settings/index.vue'

/** Opens the settings modal. Shared by the phone launcher and any other settings entry point. */
export function useSettingsModal() {
  const { open } = useOverlay()

  function open_settings() {
    return open(SettingsComponent, { presentation: 'dialog' })
  }

  return { open: open_settings }
}
