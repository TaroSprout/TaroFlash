import { readonly, ref } from 'vue'

// Shared mock + setter for `@/composables/ui/safe-area`'s useBottomChromeCover,
// following the same dynamic-import-inside-vi.mock-factory shape as the sibling
// media-query / keyboard mocks.
const is_covered = ref(false)

export const chromeCoverMockModule = {
  useBottomChromeCover: () => ({ is_covered: readonly(is_covered) })
}

export function setChromeCovered(covered) {
  is_covered.value = covered
}
