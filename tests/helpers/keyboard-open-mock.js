import { ref } from 'vue'

// Shared mock + setter for `@/composables/ui/keyboard`, following the same
// dynamic-import-inside-vi.mock-factory shape as breakpoint-media-mock — the
// ref must live outside the test file so `vi.mock`'s hoisting can't try to
// close over a not-yet-initialized top-level const.
const is_open = ref(false)

export const keyboardOpenMockModule = {
  useKeyboardOpen: () => ({ is_open })
}

export function setKeyboardOpen(open) {
  is_open.value = open
}
