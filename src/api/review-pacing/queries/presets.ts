import { useQuery } from '@pinia/colada'
import { fetchPresets } from '../db'

export function usePresetsQuery() {
  return useQuery({
    key: ['review-pacing-presets'],
    query: fetchPresets
  })
}
