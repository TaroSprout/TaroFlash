// Caller gate for functions whose only legitimate caller is a pg_cron job.
//
// `verify_jwt = true` proves the gateway already validated the token's
// signature — a forged token never reaches us — but it does NOT prove *who*
// sent it. The public anon key is itself a validly-signed project JWT, so it
// clears the gateway. Checking the role claim is what actually restricts the
// caller to the cron job, which authenticates with the service_role key.

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  // A JWT is `header.payload.signature`; the payload is the base64url middle
  // segment. Safe to read without re-verifying — the gateway did that already.
  const segment = token.split('.')[1]
  if (!segment) return null

  const b64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)

  try {
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

/**
 * Returns a rejection Response to send verbatim, or `null` when the caller
 * holds the service_role key.
 */
export function assertServiceRole(req: Request): Response | null {
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const role = token ? decodeJwtPayload(token)?.role : null

  if (!role) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }
  if (role !== 'service_role') {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
  }
  return null
}
