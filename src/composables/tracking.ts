import {
  trackPageview as trackPlausiblePageview,
  trackEvent as trackPlausibleEvent
} from '@/utils/analytics/plausible'

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

  /** The sign-up modal opened, from any entry point. */
  function trackSignupStarted() {
    trackPlausibleEvent('Signup Started')
  }

  /** An account was just created — email/password, or a brand-new Google sign-in. */
  function trackSignupCompleted() {
    trackPlausibleEvent('Signup Completed')
  }

  return { trackPageview, trackSignupStarted, trackSignupCompleted }
}
