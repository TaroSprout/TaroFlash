import { useModal } from '@/composables/modal'
import SettingsComponent from '@/components/settings/index.vue'

/** Opens the settings modal. Shared by the phone launcher and any other settings entry point. */
export function useSettingsModal() {
  const modal = useModal()

  function open() {
    return modal.open(SettingsComponent, {
      backdrop: true,
      mode: 'mobile-sheet',
      mobile_below_width: 'mlg',
      mobile_below_height: 'md'
    })
  }

  return { open }
}
