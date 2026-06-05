import { useMutation } from '@pinia/colada'
import { translateTerm, type TranslateTermArgs } from '../db'

// A one-shot action, not cached server state — wrapped in useMutation only for
// the built-in isLoading / error / data refs the popover needs. No onSettled
// invalidation because there's nothing in the cache to touch.
export function useTranslateTermMutation() {
  return useMutation({
    mutation: (args: TranslateTermArgs) => translateTerm(args)
  })
}
