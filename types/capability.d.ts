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
