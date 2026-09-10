// Regression coverage for the shared ['capability-switches', memberId] cache
// entry: the admin's switch-row mutation and useCan().useAudioReader both
// read/write through the same Pinia Colada entry, so the downstream visibility
// gate has to pick up an admin's flip without a page reload, and the value has
// to survive the admin panel unmounting and remounting (closing and reopening
// the modal) since the cache lives on the shared Pinia instance, not on the
// modal's own component tree.
import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada, useQueryCache } from '@pinia/colada'
import { flushPromises } from '@vue/test-utils'

const {
  updateCapabilitySwitchMock,
  fetchCapabilitySwitchesMock,
  roleRef,
  deckCountRef,
  serverRows
} = vi.hoisted(() => {
  return {
    updateCapabilitySwitchMock: vi.fn(),
    fetchCapabilitySwitchesMock: vi.fn(),
    roleRef: { value: 'admin' },
    deckCountRef: { value: 0 },
    serverRows: []
  }
})

// A fake server-side row store: the write mutates it, the read reflects it —
// mirroring what the real onSettled invalidation-triggered refetch would see.
vi.mock('@/api/capabilities/db', () => ({
  updateCapabilitySwitch: updateCapabilitySwitchMock,
  fetchCapabilitySwitches: fetchCapabilitySwitchesMock
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ user: { id: 'member-123' } })
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({
    get role() {
      return roleRef.value
    },
    plan: 'free',
    deck_limit: null,
    cards_per_deck_limit: null
  })
}))

vi.mock('@/api/decks', () => ({
  useMemberDeckCountQuery: () => ({ data: deckCountRef })
}))

import { useCan } from '@/composables/can'
import { useUpdateCapabilitySwitchMutation } from '@/api/capabilities/mutations/update-switch'

/**
 * Hosts the admin's row mutation and a downstream reader (useAudioReader) in
 * the same Pinia Colada cache, the way the running app does: the switches
 * page and the dashboard both read through the shared ['capability-switches']
 * entry.
 */
function mountHost(pinia) {
  let can, mutation, query_cache
  const app = createApp({
    setup() {
      can = useCan()
      mutation = useUpdateCapabilitySwitchMutation()
      query_cache = useQueryCache()
      return () => null
    }
  })
  app.use(pinia)
  app.use(PiniaColada)
  app.mount(document.createElement('div'))
  return { app, can, mutation, query_cache }
}

beforeEach(() => {
  serverRows.length = 0
  serverRows.push({ key: 'audio_reader', state: 'off' })

  updateCapabilitySwitchMock.mockReset().mockImplementation(async (params) => {
    const row = serverRows.find((r) => r.key === params.key)
    if (row) row.state = params.state
  })
  fetchCapabilitySwitchesMock
    .mockReset()
    .mockImplementation(async () => serverRows.map((r) => ({ ...r })))

  roleRef.value = 'admin'
  deckCountRef.value = 0
})

describe('capability-switches shared cache', () => {
  test('flipping the row cascades to useAudioReader before the write resolves', async () => {
    const pinia = createPinia()
    const { app, can, mutation } = mountHost(pinia)
    await flushPromises()
    await flushPromises()
    expect(can.useAudioReader.value).toBe(false)

    const pending = mutation.mutateAsync({ key: 'audio_reader', state: 'on' })
    await Promise.resolve()
    await Promise.resolve()

    // The optimistic flip is visible before the underlying write — and any
    // onSettled invalidation refetch it triggers — has resolved.
    expect(can.useAudioReader.value).toBe(true)

    await pending
    app.unmount()
  })

  test('the flipped state is still correct after the admin panel is closed and reopened', async () => {
    const pinia = createPinia()
    const first = mountHost(pinia)
    await flushPromises()
    await flushPromises()
    await first.mutation.mutateAsync({ key: 'audio_reader', state: 'on' })
    await flushPromises()
    expect(first.can.useAudioReader.value).toBe(true)

    // Close the admin panel: unmount the consuming component tree. The query
    // cache lives on the shared Pinia instance, not on this tree.
    first.app.unmount()

    // Reopen: a fresh component tree reading through the same Pinia instance.
    const second = mountHost(pinia)
    await flushPromises()
    await flushPromises()

    expect(second.can.useAudioReader.value).toBe(true)
    second.app.unmount()
  })
})
