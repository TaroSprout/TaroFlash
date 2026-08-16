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
 * Owns the checkout modal's Stripe Elements session, open/close chimes, and a single
 * `status` collapsing every loading/error/success signal the UI branches on.
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

  onMounted(() => emitSfx('dialog.open'))
  onBeforeUnmount(() => emitSfx('dialog.close'))

  useModalRequestClose(() => {
    if (status.value === 'confirming') return
    close()
  })

  // Polls instead of trusting the first refetch — the member row flips to `paid`
  // only once the Stripe webhook syncs, which can lag a few seconds behind `confirm()`.
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
    // Resubscribing clears the downgrade grace, so the deck list's is_locked flags flip off.
    queryCache.invalidateQueries({ key: ['decks'] })
    is_confirming.value = false
    is_success.value = true

    emitSfx('notice.success')
    await wait(SUCCESS_DISPLAY_MS)
    close({ upgraded: true })
  }

  return {
    status,
    is_ready,
    onSubmit
  }
}
