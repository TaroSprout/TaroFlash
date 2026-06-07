import { ref } from 'vue'

const has_sidebar = ref(false)
const is_mobile = ref(false)

/**
 * Shared mock module + setters for `@/composables/use-media-query`.
 *
 * Refs live at module scope so a `vi.mock` factory that imports this file
 * sees the same instances the test code does. Vitest's per-file module
 * isolation keeps state from leaking between test files.
 *
 * `'w>=lg & fine'` is the one desktop-sidebar token (toggle with `setSidebar`);
 * any `w<…` compact token resolves to the mobile ref (toggle with `setBelowMd`).
 *
 * @example
 *   import { responsiveMockModule, setSidebar, setBelowMd, resetResponsive }
 *     from '../../helpers/responsive-mock'
 *
 *   vi.mock('@/composables/use-media-query', async () => {
 *     const m = await import('../../helpers/responsive-mock')
 *     return m.responsiveMockModule
 *   })
 *
 *   beforeEach(() => resetResponsive())
 */
export const responsiveMockModule = {
  useMatchMedia: (query) => {
    if (query.includes('&')) return has_sidebar
    if (query.startsWith('w<')) return is_mobile
    return ref(false)
  }
}

export function setSidebar(v) {
  has_sidebar.value = v
}

export function setBelowMd(v) {
  is_mobile.value = v
}

export function resetResponsive() {
  has_sidebar.value = false
  is_mobile.value = false
}
