import { trackPageview as trackPlausiblePageview } from '@/utils/analytics/plausible'

/**
 * The one place the app reports activity to an analytics provider.
 *
 * Call sites say what happened; which providers hear about it — or whether any
 * do — is decided here, so a provider can be added or swapped without touching
 * them.
 */
export function useTracking() {
  function trackPageview() {
    trackPlausiblePageview()
  }

  return { trackPageview }
}
