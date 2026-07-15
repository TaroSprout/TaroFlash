import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ChangeCcModal, { type ChangeCardResponse } from './change-cc-modal.vue'
import {
  usePaymentMethodsQuery,
  useSetDefaultPaymentMethodMutation,
  useDetachPaymentMethodMutation
} from '@/api/billing'
import { useModal } from '@/composables/modal'
import { useNoticeStore } from '@/stores/notice-store'

/**
 * Opens the change-card modal, then syncs the returned payment method as the
 * new default and detaches whatever card(s) it replaced.
 */
export function useChangeCcClick() {
  const { t } = useI18n()
  const modal = useModal()
  const notice = useNoticeStore()

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

    const response = await modal.open<ChangeCardResponse>(ChangeCcModal, {
      mode: 'popup',
      backdrop: true,
      props: { has_existing_card: !!default_card.value }
    }).response

    if (!response?.added) return

    if (response.paymentMethodId) {
      try {
        await set_default_mutation.mutateAsync(response.paymentMethodId)
      } catch {
        notice.error(t('settings.subscription.payment-methods.set-default-error'), {
          variant: 'panel'
        })
        return
      }

      const stale_ids = old_ids.filter((id) => id !== response.paymentMethodId)
      for (const id of stale_ids) {
        try {
          await detach_mutation.mutateAsync(id)
        } catch {
          notice.error(t('settings.subscription.payment-methods.detach-error'), {
            variant: 'panel'
          })
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
