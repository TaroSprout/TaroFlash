import { useCapabilitySwitchesQuery } from './switches'

/**
 * The client's read layer for capability switches — every launch-flagged
 * feature asks through this.
 *
 * `isLive(key, fallback)` answers "is this capability live?" against the cached
 * switch rows. The caller owns the fallback because only the feature knows
 * which way to fail while the answer is still unknown: a launch flag stays dark
 * (`false`) until proven live. The fallback covers exactly two windows — before
 * the rows have loaded, and when the read is unreachable. Once they load, the
 * answer is the row: `on` is live, anything else (off, or no row) is not,
 * matching the server's fail-closed read. Read inside a `computed` it stays
 * reactive, re-deriving when the query refetches.
 */
export function useCapabilities() {
  const query = useCapabilitySwitchesQuery()

  function isLive(key: CapabilityKey, fallback: boolean): boolean {
    const switches = query.data.value
    if (!switches) return fallback

    const row = switches.find((s) => s.key === key)
    return row?.state === 'on'
  }

  return { isLive }
}
