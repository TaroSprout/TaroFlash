import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQueryCache } from '@pinia/colada'
import { useCreateSubscriptionMutation } from '@/api/billing'
import { useCheckoutElements } from '@/composables/billing/use-checkout-elements'
import { emitSfx } from '@/sfx/bus'

export type CheckoutResponse = { upgraded: boolean }

/**
 * Owns the checkout modal's Stripe Elements session, success state, and
 * open/close chimes. `onSubmit` confirms the payment and flips to the
 * success view; `onDone` closes the modal reporting the upgrade.
 */
export function useCheckout(close: (response?: CheckoutResponse) => void) {
  const { t } = useI18n()
  const queryCache = useQueryCache()
  const { mutateAsync: createSubscription } = useCreateSubscriptionMutation()

  const is_success = ref(false)

  const { is_loading, is_submitting, is_ready, load_error, submit_error, confirm } =
    useCheckoutElements({
      publicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
      genericErrorMessage: t('billing.checkout.submit-error'),
      getClientSecret: async () => {
        const { clientSecret } = await createSubscription({
          planId: 'paid',
          returnUrl: window.location.origin
        })
        return clientSecret
      }
    })

  onMounted(() => emitSfx('wooden_chime_ring'))
  onBeforeUnmount(() => emitSfx('pop_up_close'))

  async function onSubmit() {
    const outcome = await confirm()
    if (outcome.status !== 'success') return

    queryCache.invalidateQueries({ key: ['member'] })
    is_success.value = true
  }

  function onDone() {
    close({ upgraded: true })
  }

  return {
    is_loading,
    is_submitting,
    is_ready,
    load_error,
    submit_error,
    is_success,
    onSubmit,
    onDone
  }
}
