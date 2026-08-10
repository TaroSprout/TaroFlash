type PlausibleInitOptions = { autoCapturePageviews?: boolean }
type PlausibleQueueFn = ((...args: unknown[]) => void) & {
  q?: unknown[][]
  o?: PlausibleInitOptions
  init?: (options?: PlausibleInitOptions) => void
}

declare global {
  interface Window {
    plausible?: PlausibleQueueFn
  }
}

let script_injected = false

/**
 * Loads Plausible's per-site script once, queuing any `plausible()` calls
 * made before it finishes loading, then turns off autocapture so only the
 * explicit `trackPageview()` calls below ever count a visit.
 */
function ensureScriptLoaded(site_id: string) {
  if (script_injected) return
  script_injected = true

  const plausible: PlausibleQueueFn =
    window.plausible ||
    ((...args: unknown[]) => {
      plausible.q = plausible.q || []
      plausible.q.push(args)
    })
  plausible.init = plausible.init || ((options) => (plausible.o = options ?? {}))
  window.plausible = plausible

  const script = document.createElement('script')
  script.async = true
  script.src = `https://plausible.io/js/${site_id}.js`
  document.head.appendChild(script)

  plausible.init({ autoCapturePageviews: false })
}

/**
 * Counts one visit with Plausible — only when a site id is configured for
 * this build, so staging and local runs never send anything.
 */
export function trackPageview() {
  const site_id = import.meta.env.VITE_PLAUSIBLE_SITE_ID
  if (!site_id) return

  ensureScriptLoaded(site_id)
  window.plausible?.('pageview')
}
