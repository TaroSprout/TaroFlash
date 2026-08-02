// Where to send a member after they sign in — the in-app path they were
// reaching when the auth checkpoint bounced them to /welcome. It rides there as
// a `?next=` query param, then is stashed here so it survives the full-page
// Google OAuth redirect, which wipes both router state and `history.state`.
//
// sessionStorage, not localStorage: the value is only meaningful within the tab
// that started the sign-in, and the full-page OAuth redirect returns to that
// same tab. Keyed alongside the `oauth-popup-pending` flag in api/session.
const RETURN_DESTINATION_KEY = 'auth-return-destination'

// In-app paths only: an absolute path rooted at our own origin. Rejects full
// URLs, protocol-relative `//host`, and the `/\host` backslash trick browsers
// treat as a host — the classic open-redirect footgun.
function isInAppPath(next: unknown): next is string {
  return typeof next === 'string' && /^\/(?![/\\])/.test(next)
}

/** Stash an intended post-sign-in destination when it's a safe in-app path. */
export function captureReturnDestination(next: unknown): void {
  if (isInAppPath(next)) window.sessionStorage.setItem(RETURN_DESTINATION_KEY, next)
  else window.sessionStorage.removeItem(RETURN_DESTINATION_KEY)
}

/** Read and clear the stashed destination. Returns a safe in-app path, or null. */
export function consumeReturnDestination(): string | null {
  const next = window.sessionStorage.getItem(RETURN_DESTINATION_KEY)
  window.sessionStorage.removeItem(RETURN_DESTINATION_KEY)
  return isInAppPath(next) ? next : null
}
