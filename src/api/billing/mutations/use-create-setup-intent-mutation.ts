import { useMutation, useQueryCache } from '@pinia/colada'
import { createSetupIntent } from '../db'

/**
 * Requests a Stripe Checkout Session (setup mode) and returns its
 * `clientSecret` so the client can mount a Payment Element and confirm it
 * to attach a new card to the customer without an immediate charge.
 * Used by the add-credit-card modal.
 *
 * Invalidates the payment-methods list so the newly attached card appears.
 */
export function useCreateSetupIntentMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (returnUrl: string) => createSetupIntent(returnUrl),
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['billing', 'payment-methods'] })
    }
  })
}
