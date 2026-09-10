import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada, useQueryCache } from '@pinia/colada'
import { flushPromises } from '@vue/test-utils'

const { updateCapabilityMock } = vi.hoisted(() => ({
  updateCapabilityMock: vi.fn()
}))

vi.mock('@/api/capabilities/db', () => ({
  updateCapability: updateCapabilityMock
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ user: { id: 'member-123' } })
}))

import { useUpdateCapabilityMutation } from '@/api/capabilities/mutations/update-capability'

function mountHost() {
  let mutation, query_cache
  const app = createApp({
    setup() {
      mutation = useUpdateCapabilityMutation()
      query_cache = useQueryCache()
      return () => null
    }
  })
  app.use(createPinia())
  app.use(PiniaColada)
  app.mount(document.createElement('div'))
  return { app, mutation, query_cache }
}

const cacheKey = ['capabilities', 'member-123']

beforeEach(() => {
  updateCapabilityMock.mockReset()
})

describe('useUpdateCapabilityMutation', () => {
  test('onMutate flips the targeted row in the cache before the write resolves', async () => {
    let resolveWrite
    updateCapabilityMock.mockReturnValue(
      new Promise((resolve) => {
        resolveWrite = resolve
      })
    )
    const { app, mutation, query_cache } = mountHost()
    query_cache.setQueryData(cacheKey, [
      { key: 'audio_reader', state: 'off' },
      { key: 'other_switch', state: 'on' }
    ])

    const pending = mutation.mutateAsync({ key: 'audio_reader', state: 'on' })
    await flushPromises()

    expect(query_cache.getQueryData(cacheKey)).toEqual([
      { key: 'audio_reader', state: 'on' },
      { key: 'other_switch', state: 'on' }
    ])

    resolveWrite()
    await pending
    app.unmount()
  })

  test('onError rolls back to the exact prior snapshot', async () => {
    updateCapabilityMock.mockRejectedValue(new Error('write refused'))
    const { app, mutation, query_cache } = mountHost()
    const original = [
      { key: 'audio_reader', state: 'off' },
      { key: 'other_switch', state: 'on' }
    ]
    query_cache.setQueryData(cacheKey, original)

    await expect(mutation.mutateAsync({ key: 'audio_reader', state: 'on' })).rejects.toThrow(
      'write refused'
    )

    expect(query_cache.getQueryData(cacheKey)).toEqual(original)
    app.unmount()
  })

  test('onSettled invalidates every query keyed under the capabilities prefix', async () => {
    updateCapabilityMock.mockResolvedValue(undefined)
    const { app, mutation, query_cache } = mountHost()
    query_cache.setQueryData(cacheKey, [{ key: 'audio_reader', state: 'off' }])
    const invalidateSpy = vi.spyOn(query_cache, 'invalidateQueries')

    await mutation.mutateAsync({ key: 'audio_reader', state: 'on' })

    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['capabilities'] })
    app.unmount()
  })

  test('does nothing to the cache when no snapshot existed at mutate time', async () => {
    updateCapabilityMock.mockResolvedValue(undefined)
    const { app, mutation, query_cache } = mountHost()

    await mutation.mutateAsync({ key: 'audio_reader', state: 'on' })

    expect(query_cache.getQueryData(cacheKey)).toBeUndefined()
    app.unmount()
  })
})
