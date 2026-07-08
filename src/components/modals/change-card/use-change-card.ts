import { onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQueryCache } from '@pinia/colada'
import { useCreateSetupIntentMutation } from '@/api/billing'
import { useCheckoutElements } from '@/composables/billing/use-checkout-elements'
import { emitSfx } from '@/sfx/bus'

export type ChangeCardResponse = { added: boolean; paymentMethodId: string | null }

/**
 * Owns the change-card modal's Stripe Elements session: creates a setup
 * intent, confirms the entered card, invalidates the payment-methods cache,
 * and closes reporting the new payment method id. Plays the same open/close
 * chimes as the checkout modal.
 */
export function useChangeCard(close: (response?: ChangeCardResponse) => void) {
  const { t } = useI18n()
  const queryCache = useQueryCache()
  const { mutateAsync: createSetupIntent } = useCreateSetupIntentMutation()

  const { is_loading, is_submitting, is_ready, load_error, confirm } = useCheckoutElements({
    publicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
    genericErrorMessage: t('settings.subscription.change-card.submit-error'),
    getClientSecret: async () => {
      const { clientSecret } = await createSetupIntent(window.location.origin)
      return clientSecret
    }
  })

  onMounted(() => emitSfx('wooden_chime_ring'))
  onBeforeUnmount(() => emitSfx('pop_up_close'))

  async function onSubmit() {
    const outcome = await confirm()
    if (outcome.status !== 'success') return

    queryCache.invalidateQueries({ key: ['billing', 'payment-methods'] })
    const paymentMethodId = outcome.session.savedPaymentMethods?.[0]?.id ?? null
    close({ added: true, paymentMethodId })
  }

  return {
    is_loading,
    is_submitting,
    is_ready,
    load_error,
    onSubmit
  }
}
