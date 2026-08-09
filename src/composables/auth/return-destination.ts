// Where to send a member after sign-in. →[K:return-destination-open-redirect]
const RETURN_DESTINATION_KEY = 'auth-return-destination'

/**
 * Rejects anything that could leave this app — a crafted `?next=` link must
 * never bounce a member to a lookalike site the moment they sign in.
 * →[K:return-destination-open-redirect]
 */
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
