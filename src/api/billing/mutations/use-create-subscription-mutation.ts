import { useMutation } from '@pinia/colada'
import { createSubscription, type CreateSubscriptionArgs } from '../db'

/**
 * Creates a Stripe Checkout Session (subscription mode) for the caller's
 * selected plan and returns its `clientSecret`. The client mounts a Payment
 * Element against that secret and confirms it to activate the subscription.
 * Used by the initial checkout flow, not plan changes.
 */
export function useCreateSubscriptionMutation() {
  return useMutation({
    mutation: (args: CreateSubscriptionArgs) => createSubscription(args)
  })
}
