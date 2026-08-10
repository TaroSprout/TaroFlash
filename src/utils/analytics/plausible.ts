type PlausibleQueueFn = ((...args: unknown[]) => void) & { q?: unknown[][] }

declare global {
  interface Window {
    plausible?: PlausibleQueueFn
  }
}

let script_injected = false

/**
 * Loads Plausible's manual-pageview script once, queuing any `plausible()`
 * calls made before it finishes loading.
 */
function ensureScriptLoaded(domain: string) {
  if (script_injected) return
  script_injected = true

  window.plausible =
    window.plausible ||
    ((...args: unknown[]) => {
      const fn = window.plausible!
      fn.q = fn.q || []
      fn.q.push(args)
    })

  const script = document.createElement('script')
  script.defer = true
  script.dataset.domain = domain
  script.src = 'https://plausible.io/js/script.manual.js'
  document.head.appendChild(script)
}

/**
 * Counts one visit with Plausible — only when a site domain is configured
 * for this build, so staging and local runs never send anything.
 */
export function trackPageview() {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN
  if (!domain) return

  ensureScriptLoaded(domain)
  window.plausible?.('pageview')
}
