import { useMutation, useQueryCache } from '@pinia/colada'
import { setDefaultPaymentMethod } from '../db'

/** Picks which saved card gets charged from the next bill onwards. */
export function useSetDefaultPaymentMethodMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (paymentMethodId: string) => setDefaultPaymentMethod(paymentMethodId),
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['billing', 'payment-methods'] })
      queryCache.invalidateQueries({ key: ['billing', 'subscription'] })
    }
  })
}
