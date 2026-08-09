import { useMutation } from '@pinia/colada'
import { createSubscription, type CreateSubscriptionArgs } from '../db'

/**
 * Opens the payment form for a first subscription. Confirming it starts the
 * plan. Moving between plans is a different call.
 */
export function useCreateSubscriptionMutation() {
  return useMutation({
    mutation: (args: CreateSubscriptionArgs) => createSubscription(args)
  })
}
