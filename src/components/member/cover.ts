import { coverBindings, type CoverBindingsOptions } from '@/utils/cover'
import { withMemberCardCoverDefaults } from '@/utils/member/defaults'

export function memberCoverBindings(
  cover?: DeckCover,
  overrides?: Omit<CoverBindingsOptions, 'border'>
) {
  return coverBindings(withMemberCardCoverDefaults(cover), { ...overrides, border: false })
}
