import { useQuery } from '@pinia/colada'
import { fetchMemberCardIndex } from '../db'

export type { CardIndexEntry } from '../db'

/** Every term the member has a card for, and which decks hold it. */
export function useMemberCardIndexQuery() {
  return useQuery({
    key: () => ['cards', 'index'],
    query: () => fetchMemberCardIndex()
  })
}
