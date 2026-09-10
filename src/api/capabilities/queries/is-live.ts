import { useCapabilitiesQuery } from './capabilities'

/**
 * The client's read layer for capability switches — every launch-flagged
 * feature asks through this.
 *
 * `isLive(key, fallback)` reads the cached switch rows: an `on` row is live,
 * anything else is not. The caller owns the fallback because only the feature
 * knows which way to fail before the rows load or when the read is unreachable
 * — a launch flag passes `false` to stay dark until proven live.
 * →[K:capability-server-has-no-fallback]
 */
export function useCapabilities() {
  const query = useCapabilitiesQuery()

  function isLive(key: CapabilityKey, fallback: boolean): boolean {
    const switches = query.data.value
    if (!switches) return fallback

    const row = switches.find((s) => s.key === key)
    return row?.state === 'on'
  }

  return { isLive }
}
