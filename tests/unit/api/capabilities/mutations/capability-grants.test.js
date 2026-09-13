import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada, useQueryCache } from '@pinia/colada'
import { flushPromises } from '@vue/test-utils'

const { addCapabilityGrantMock, removeCapabilityGrantMock } = vi.hoisted(() => ({
  addCapabilityGrantMock: vi.fn(),
  removeCapabilityGrantMock: vi.fn()
}))

vi.mock('@/api/capabilities/db', () => ({
  addCapabilityGrant: addCapabilityGrantMock,
  removeCapabilityGrant: removeCapabilityGrantMock
}))

import {
  useAddCapabilityGrantMutation,
  useRemoveCapabilityGrantMutation
} from '@/api/capabilities/mutations/capability-grants'

function mountHost(useMutationHook) {
  let mutation, query_cache
  const app = createApp({
    setup() {
      mutation = useMutationHook()
      query_cache = useQueryCache()
      return () => null
    }
  })
  app.use(createPinia())
  app.use(PiniaColada)
  app.mount(document.createElement('div'))
  return { app, mutation, query_cache }
}

const cacheKey = ['capability-grants', 'audio_reader']

beforeEach(() => {
  addCapabilityGrantMock.mockReset()
  removeCapabilityGrantMock.mockReset()
})

describe('useAddCapabilityGrantMutation', () => {
  test('appends the picked member to the cached list before the refetch resolves', async () => {
    let resolveWrite
    addCapabilityGrantMock.mockReturnValue(
      new Promise((resolve) => {
        resolveWrite = resolve
      })
    )
    const { app, mutation, query_cache } = mountHost(useAddCapabilityGrantMutation)
    query_cache.setQueryData(cacheKey, [
      {
        id: 'member-1',
        display_name: 'Gina',
        avatar_url: null,
        granted_at: '2026-01-01T00:00:00.000Z'
      }
    ])

    const pending = mutation.mutateAsync({
      key: 'audio_reader',
      member: { id: 'member-2', display_name: 'Nick', avatar_url: 'https://example.com/nick.png' }
    })
    await flushPromises()

    const cached = query_cache.getQueryData(cacheKey)
    expect(cached).toHaveLength(2)
    expect(cached[1]).toMatchObject({
      id: 'member-2',
      display_name: 'Nick',
      avatar_url: 'https://example.com/nick.png'
    })

    resolveWrite()
    await pending
    app.unmount()
  })

  test('onError restores the exact prior snapshot', async () => {
    addCapabilityGrantMock.mockRejectedValue(new Error('write refused'))
    const { app, mutation, query_cache } = mountHost(useAddCapabilityGrantMutation)
    const original = [
      {
        id: 'member-1',
        display_name: 'Gina',
        avatar_url: null,
        granted_at: '2026-01-01T00:00:00.000Z'
      }
    ]
    query_cache.setQueryData(cacheKey, original)

    await expect(
      mutation.mutateAsync({
        key: 'audio_reader',
        member: { id: 'member-2', display_name: 'Nick', avatar_url: null }
      })
    ).rejects.toThrow('write refused')

    expect(query_cache.getQueryData(cacheKey)).toEqual(original)
    app.unmount()
  })

  test('onSettled invalidates the capability-grants query key', async () => {
    addCapabilityGrantMock.mockResolvedValue(undefined)
    const { app, mutation, query_cache } = mountHost(useAddCapabilityGrantMutation)
    const invalidateSpy = vi.spyOn(query_cache, 'invalidateQueries')

    await mutation.mutateAsync({
      key: 'audio_reader',
      member: { id: 'member-2', display_name: 'Nick', avatar_url: null }
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['capability-grants'] })
    app.unmount()
  })
})

describe('useRemoveCapabilityGrantMutation', () => {
  test('filters the removed member out of the cached list', async () => {
    let resolveWrite
    removeCapabilityGrantMock.mockReturnValue(
      new Promise((resolve) => {
        resolveWrite = resolve
      })
    )
    const { app, mutation, query_cache } = mountHost(useRemoveCapabilityGrantMutation)
    query_cache.setQueryData(cacheKey, [
      {
        id: 'member-1',
        display_name: 'Gina',
        avatar_url: null,
        granted_at: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'member-2',
        display_name: 'Nick',
        avatar_url: null,
        granted_at: '2026-01-02T00:00:00.000Z'
      }
    ])

    const pending = mutation.mutateAsync({ key: 'audio_reader', member_id: 'member-2' })
    await flushPromises()

    expect(query_cache.getQueryData(cacheKey)).toEqual([
      {
        id: 'member-1',
        display_name: 'Gina',
        avatar_url: null,
        granted_at: '2026-01-01T00:00:00.000Z'
      }
    ])

    resolveWrite()
    await pending
    app.unmount()
  })

  test('onError restores the exact prior snapshot', async () => {
    removeCapabilityGrantMock.mockRejectedValue(new Error('write refused'))
    const { app, mutation, query_cache } = mountHost(useRemoveCapabilityGrantMutation)
    const original = [
      {
        id: 'member-1',
        display_name: 'Gina',
        avatar_url: null,
        granted_at: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'member-2',
        display_name: 'Nick',
        avatar_url: null,
        granted_at: '2026-01-02T00:00:00.000Z'
      }
    ]
    query_cache.setQueryData(cacheKey, original)

    await expect(
      mutation.mutateAsync({ key: 'audio_reader', member_id: 'member-2' })
    ).rejects.toThrow('write refused')

    expect(query_cache.getQueryData(cacheKey)).toEqual(original)
    app.unmount()
  })

  test('onSettled invalidates the capability-grants query key', async () => {
    removeCapabilityGrantMock.mockResolvedValue(undefined)
    const { app, mutation, query_cache } = mountHost(useRemoveCapabilityGrantMutation)
    const invalidateSpy = vi.spyOn(query_cache, 'invalidateQueries')

    await mutation.mutateAsync({ key: 'audio_reader', member_id: 'member-2' })

    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['capability-grants'] })
    app.unmount()
  })

  test('does nothing to the cache when no snapshot existed at mutate time', async () => {
    removeCapabilityGrantMock.mockResolvedValue(undefined)
    const { app, mutation, query_cache } = mountHost(useRemoveCapabilityGrantMutation)

    await mutation.mutateAsync({ key: 'audio_reader', member_id: 'member-2' })

    expect(query_cache.getQueryData(cacheKey)).toBeUndefined()
    app.unmount()
  })
})
