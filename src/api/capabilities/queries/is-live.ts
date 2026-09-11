import { useCapabilitiesQuery } from './capabilities'

/**
 * The client's read layer for capabilities — every launch-flagged
 * feature asks through this.
 *
 * The caller owns the fallback because only the feature
 * knows which way to fail before the rows load or when the read is unreachable
 * — a launch flag passes `false` to stay dark until proven live.
 * →[K:capability-server-has-no-fallback]
 */
export function useCapabilities() {
  const query = useCapabilitiesQuery()

  function isLive(key: CapabilityKey, fallback: boolean): boolean {
    const capabilities = query.data.value
    if (!capabilities) return fallback

    const row = capabilities.find((capability) => capability.key === key)
    return row?.state === 'on'
  }

  return { isLive }
}
