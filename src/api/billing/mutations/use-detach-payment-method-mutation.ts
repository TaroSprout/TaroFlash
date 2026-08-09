import { useMutation, useQueryCache } from '@pinia/colada'
import { detachPaymentMethod } from '../db'

/**
 * Forgets a saved card. Charges already made against it are untouched — this
 * only stops future ones.
 */
export function useDetachPaymentMethodMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (paymentMethodId: string) => detachPaymentMethod(paymentMethodId),
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['billing', 'payment-methods'] })
    }
  })
}
