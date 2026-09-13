// `targeted` reads live only for a member on the capability's allow-list; the
// allow-list itself lives server-side. See corpus/authz/capabilities.md.
type CapabilityState = 'off' | 'on' | 'targeted'

// The keys the client knows how to ask about. Grows one entry per launched
// capability; `audio_reader` is the first.
type CapabilityKey = 'audio_reader'

// The client only ever reads a capability's key and state — the allow-list and the
// audit columns stay server-side.
type Capability = {
  key: CapabilityKey
  state: CapabilityState
}

// One cache entry for the whole capabilities read: the rows plus which keys the
// caller's own capability_grants rows cover, so a `targeted` state resolves
// without a second query.
type CapabilitiesResult = {
  capabilities: Capability[]
  grantedKeys: Set<CapabilityKey>
}
