import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import ChangeCardModal, { type ChangeCardResponse } from '@/components/modals/change-card/index.vue'
import {
  usePaymentMethodsQuery,
  useSetDefaultPaymentMethodMutation,
  useDetachPaymentMethodMutation
} from '@/api/billing'
import { useModal } from '@/composables/modal'
import { useToast } from '@/composables/toast'
import { settingsRecedeKey } from '../layout'

/**
 * Wraps opening the change-card modal with the settings-modal recede/restore
 * choreography, then syncs the returned payment method as the new default
 * and detaches whatever card(s) it replaced.
 */
export function useChangeCardClick() {
  const { t } = useI18n()
  const recede = inject(settingsRecedeKey)
  const modal = useModal()
  const toast = useToast()

  const methods_query = usePaymentMethodsQuery()
  const set_default_mutation = useSetDefaultPaymentMethodMutation()
  const detach_mutation = useDetachPaymentMethodMutation()

  const payment_methods = computed(() => methods_query.data.value?.paymentMethods ?? [])
  const default_id = computed(() => methods_query.data.value?.defaultPaymentMethodId ?? null)
  const default_card = computed(
    () =>
      payment_methods.value.find((m) => m.id === default_id.value) ??
      payment_methods.value[0] ??
      null
  )

  async function onChangeCardClick() {
    const old_ids = payment_methods.value.map((m) => m.id)

    recede?.recede()
    const response = await modal.open<ChangeCardResponse>(ChangeCardModal, {
      mode: 'popup',
      backdrop: true,
      props: { has_existing_card: !!default_card.value }
    }).response
    recede?.restore()

    if (!response?.added) return

    if (response.paymentMethodId) {
      try {
        await set_default_mutation.mutateAsync(response.paymentMethodId)
      } catch {
        toast.error(t('settings.subscription.payment-methods.set-default-error'))
        return
      }

      const stale_ids = old_ids.filter((id) => id !== response.paymentMethodId)
      for (const id of stale_ids) {
        try {
          await detach_mutation.mutateAsync(id)
        } catch {
          toast.error(t('settings.subscription.payment-methods.detach-error'))
        }
      }
    }
  }

  return {
    methods_query,
    default_card,
    onChangeCardClick
  }
}
