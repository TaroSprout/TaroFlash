import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import type { DeckSettingsResponse } from '@/components/modals/deck-settings/index.vue'

const DeckSettings = defineAsyncComponent(
  () => import('@/components/modals/deck-settings/index.vue')
)

export function useDeckSettingsModal() {
  const modal = useModal()

  function open(deck: Deck) {
    emitSfx('ui.alert_clicks_wooden')
    const result = modal.open<DeckSettingsResponse>(DeckSettings, {
      backdrop: true,
      mode: 'mobile-sheet',
      mobile_below_width: 'md',
      mobile_below_height: 'md',
      props: { deck }
    })
    result.response.then(() => emitSfx('ui.pop_up_close'))
    return result
  }

  return { open }
}
