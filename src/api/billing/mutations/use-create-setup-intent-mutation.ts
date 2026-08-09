import { useMutation, useQueryCache } from '@pinia/colada'
import { createSetupIntent } from '../db'

/**
 * Opens a card-entry form for saving a new card. Nothing is charged — this only
 * puts a card on file.
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
