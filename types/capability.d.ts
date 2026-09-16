// `targeted` reads live only for a member on the capability's allow-list; the
// allow-list itself lives server-side. See corpus/authz/capabilities.md.
type CapabilityState = 'off' | 'on' | 'targeted'

// The keys the client knows how to ask about. Grows one entry per launched
// capability; `audio_reader` is the first.
type CapabilityKey = 'audio_reader' | 'session_rewards'

// The client only ever reads a capability's key and state — the allow-list and the
// audit columns stay server-side.
type Capability = {
  key: CapabilityKey
  state: CapabilityState
}

// The raw capability rows the admin editor renders — key and state only, no
// resolution. Feature-gating reads ResolvedCapability instead.
type CapabilitiesResult = {
  capabilities: Capability[]
}

// One capability's live state as the server resolved it for the calling member.
// The allow-list stays server-side — the client reads this boolean rather than
// comparing the caller's own grants locally.
type ResolvedCapability = {
  key: CapabilityKey
  live: boolean
}

// One member on a `targeted` capability's allow-list, in the safe shape the admin
// read projects — display fields plus when the grant was made, never granted_by.
type CapabilityGrant = {
  id: string
  display_name: string
  avatar_url: string | null
  granted_at: string
}
