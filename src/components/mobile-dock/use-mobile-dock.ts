import { ref } from 'vue'

// A single dock exists app-wide. The host (`mobile-dock-host`) renders the fixed
// chrome and registers its element here; each mounted `mobile-dock` fill bumps
// `fills` so the host knows to reveal itself. Module-level (like the modal stack)
// because there's one shared instance and the host/fill are siblings in the tree
// — provide/inject can't bridge them.
const el = ref<HTMLElement | null>(null)
const fills = ref(0)

/**
 * Shared state for the mobile dock — the fixed bottom bar that routes project
 * content into via `<mobile-dock>`.
 *
 * @returns `el` — the host's `<footer>` element, for routes that need to measure
 *   it (e.g. lifting scrolled content clear of the bar); `fills` — count of
 *   mounted `mobile-dock` fills, driving the host's visibility.
 */
export function useMobileDock() {
  return { el, fills }
}
