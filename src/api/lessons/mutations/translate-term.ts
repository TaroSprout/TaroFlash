import { useMutation } from '@pinia/colada'
import { translateTerm, type TranslateTermArgs } from '../db'

// A one-off ask, not stored data — a mutation purely for its loading and error state.
export function useTranslateTermMutation() {
  return useMutation({
    mutation: (args: TranslateTermArgs) => translateTerm(args)
  })
}
