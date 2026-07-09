import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQueryCache } from '@pinia/colada'
import { useCreateSubscriptionMutation } from '@/api/billing'
import { useCurrentMemberQuery } from '@/api/members'
import { useCheckoutElements } from '@/composables/billing/use-checkout-elements'
import { useModalRequestClose } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'

export type CheckoutResponse = { upgraded: boolean }
export type CheckoutStatus = 'loading' | 'error' | 'form' | 'confirming' | 'success'

const SYNC_MAX_ATTEMPTS = 8
const SYNC_INTERVAL_MS = 750
const SUCCESS_DISPLAY_MS = 1400

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Owns the checkout modal's Stripe Elements session and open/close chimes.
 * Collapses every loading/error/success signal into a single `status`, so
 * the UI branches on one value instead of combining several booleans.
 * `onSubmit` confirms the payment, waits for the member's plan to sync, then
 * flashes a success message and auto-closes reporting the upgrade. Closing
 * via backdrop/esc is suppressed while a submission is in flight.
 */
export function useCheckout(close: (response?: CheckoutResponse) => void) {
  const { t } = useI18n()
  const queryCache = useQueryCache()
  const { mutateAsync: createSubscription } = useCreateSubscriptionMutation()
  const memberQuery = useCurrentMemberQuery()

  const is_success = ref(false)
  const is_confirming = ref(false)

  const { is_loading, is_submitting, is_ready, load_error, confirm } = useCheckoutElements({
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

  const status = computed<CheckoutStatus>(() => {
    if (is_success.value) return 'success'
    if (load_error.value) return 'error'
    if (is_loading.value) return 'loading'
    if (is_submitting.value || is_confirming.value) return 'confirming'
    return 'form'
  })

  onMounted(() => emitSfx('wooden_chime_ring'))
  onBeforeUnmount(() => emitSfx('pop_up_close'))

  useModalRequestClose(() => {
    if (status.value === 'confirming') return
    close()
  })

  // The member row flips to the paid plan only once the Stripe webhook syncs
  // it — that can lag a few seconds behind `confirm()` resolving. Poll rather
  // than trusting the first refetch, so we don't show success against stale
  // free-plan data.
  async function waitForUpgradeSync() {
    for (let attempt = 0; attempt < SYNC_MAX_ATTEMPTS; attempt++) {
      const { data } = await memberQuery.refetch()
      if (data?.plan === 'paid') return
      await wait(SYNC_INTERVAL_MS)
    }
  }

  async function onSubmit() {
    const outcome = await confirm()
    if (outcome.status !== 'success') return

    is_confirming.value = true
    await waitForUpgradeSync()
    queryCache.invalidateQueries({ key: ['billing'] })
    is_confirming.value = false
    is_success.value = true

    emitSfx('success_1')
    await wait(SUCCESS_DISPLAY_MS)
    close({ upgraded: true })
  }

  return {
    status,
    is_ready,
    onSubmit
  }
}
