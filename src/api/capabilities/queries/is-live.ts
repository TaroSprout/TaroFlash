import { useResolvedCapabilitiesQuery } from './resolved'

/**
 * The client's read layer for capabilities — every launch-flagged
 * feature asks through this.
 *
 * The server resolves each capability's live state for the caller; the caller
 * owns the fallback only for before the rows load or when the read is
 * unreachable — a launch flag passes `false` to stay dark until proven live. A
 * loaded row that resolves not-live, or a key the server never returned, reads
 * false, not the fallback. →[K:capability-server-has-no-fallback]
 */
export function useCapabilities() {
  const query = useResolvedCapabilitiesQuery()

  function isLive(key: CapabilityKey, fallback: boolean): boolean {
    const resolved = query.data.value
    if (!resolved) return fallback

    const row = resolved.find((capability) => capability.key === key)
    return row?.live ?? false
  }

  return { isLive }
}
