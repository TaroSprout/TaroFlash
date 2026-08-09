import { useQuery } from '@pinia/colada'
import { listPaymentMethods } from '../db'

/** The member's saved cards, and which of them is the one that gets charged. */
export function usePaymentMethodsQuery() {
  return useQuery({
    key: ['billing', 'payment-methods'],
    query: () => listPaymentMethods()
  })
}
