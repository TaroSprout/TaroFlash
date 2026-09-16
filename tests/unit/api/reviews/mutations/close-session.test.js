import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'

const { closeStudySessionMock } = vi.hoisted(() => ({ closeStudySessionMock: vi.fn() }))

vi.mock('@/api/reviews/db', () => ({
  closeStudySession: closeStudySessionMock
}))

const { fetchSessionEarningsMock } = vi.hoisted(() => ({ fetchSessionEarningsMock: vi.fn() }))

vi.mock('@/api/rewards/db', () => ({
  fetchSessionEarnings: fetchSessionEarningsMock
}))

const { isLiveMock } = vi.hoisted(() => ({ isLiveMock: vi.fn() }))

vi.mock('@/api/capabilities', () => ({
  useCapabilities: () => ({ isLive: isLiveMock })
}))

import { useCloseStudySessionMutation } from '@/api/reviews/mutations/close-session'

function mountHost() {
  let mutation
  const app = createApp({
    setup() {
      mutation = useCloseStudySessionMutation()
      return () => null
    }
  })
  app.use(createPinia())
  app.use(PiniaColada)
  app.mount(document.createElement('div'))
  return { app, mutation }
}

beforeEach(() => {
  closeStudySessionMock.mockReset()
  closeStudySessionMock.mockResolvedValue(undefined)
  fetchSessionEarningsMock.mockReset()
  isLiveMock.mockReset()
})

describe('useCloseStudySessionMutation', () => {
  test('closes the session and returns null without reading earnings when the reward capability is not live', async () => {
    isLiveMock.mockReturnValue(false)
    const { app, mutation } = mountHost()

    const result = await mutation.mutateAsync('session-1')

    expect(closeStudySessionMock).toHaveBeenCalledWith('session-1')
    expect(fetchSessionEarningsMock).not.toHaveBeenCalled()
    expect(result).toBeNull()
    expect(isLiveMock).toHaveBeenCalledWith('session_rewards', false)
    app.unmount()
  })

  test('closes the session and returns the fetched earnings when the reward capability is live', async () => {
    isLiveMock.mockReturnValue(true)
    fetchSessionEarningsMock.mockResolvedValue({ earned: 3, balance: 10 })
    const { app, mutation } = mountHost()

    const result = await mutation.mutateAsync('session-2')

    expect(closeStudySessionMock).toHaveBeenCalledWith('session-2')
    expect(fetchSessionEarningsMock).toHaveBeenCalledWith('session-2')
    expect(result).toEqual({ earned: 3, balance: 10 })
    app.unmount()
  })
})
