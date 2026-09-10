// `targeted` and the targeting slot are reserved for later cohort work — v1
// writes only ever set off/on. See corpus/authz/capabilities.md.
type CapabilityState = 'off' | 'on' | 'targeted'

// The keys the client knows how to ask about. Grows one entry per launched
// capability; `audio_reader` is the first.
type CapabilityKey = 'audio_reader'

// The client only ever reads a switch's key and state — targeting and the audit
// columns stay server-side.
type Capability = {
  key: CapabilityKey
  state: CapabilityState
}
