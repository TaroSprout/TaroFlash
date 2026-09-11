import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada, useQueryCache } from '@pinia/colada'
import { flushPromises } from '@vue/test-utils'

const { updateCapabilityMock, fetchCapabilitiesMock, roleRef, deckCountRef, serverRows } =
  vi.hoisted(() => {
    return {
      updateCapabilityMock: vi.fn(),
      fetchCapabilitiesMock: vi.fn(),
      roleRef: { value: 'admin' },
      deckCountRef: { value: 0 },
      serverRows: []
    }
  })

vi.mock('@/api/capabilities/db', () => ({
  updateCapability: updateCapabilityMock,
  fetchCapabilities: fetchCapabilitiesMock
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
import { useUpdateCapabilityMutation } from '@/api/capabilities/mutations/update-capability'

function mountHost(pinia) {
  let can, mutation, query_cache
  const app = createApp({
    setup() {
      can = useCan()
      mutation = useUpdateCapabilityMutation()
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

  updateCapabilityMock.mockReset().mockImplementation(async (params) => {
    const row = serverRows.find((r) => r.key === params.key)
    if (row) row.state = params.state
  })
  fetchCapabilitiesMock
    .mockReset()
    .mockImplementation(async () => serverRows.map((r) => ({ ...r })))

  roleRef.value = 'admin'
  deckCountRef.value = 0
})

describe('capabilities shared cache', () => {
  test('flipping the row cascades to useAudioReader before the write resolves', async () => {
    const pinia = createPinia()
    const { app, can, mutation } = mountHost(pinia)
    await flushPromises()
    await flushPromises()
    expect(can.useAudioReader.value).toBe(false)

    const pending = mutation.mutateAsync({ key: 'audio_reader', state: 'on' })
    await Promise.resolve()
    await Promise.resolve()

    expect(can.useAudioReader.value).toBe(true) // optimistic flip, before the write resolves

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

    first.app.unmount() // closes the panel; the cache lives on Pinia, not this tree

    const second = mountHost(pinia) // fresh tree, same Pinia instance
    await flushPromises()
    await flushPromises()

    expect(second.can.useAudioReader.value).toBe(true)
    second.app.unmount()
  })
})
