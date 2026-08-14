import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { mockTrackPageview, mockTrackEvent } = vi.hoisted(() => ({
  mockTrackPageview: vi.fn(),
  mockTrackEvent: vi.fn()
}))

vi.mock('@/utils/analytics/plausible', () => ({
  trackPageview: mockTrackPageview,
  trackEvent: mockTrackEvent
}))

import { useTracking } from '@/composables/tracking'

beforeEach(() => {
  mockTrackPageview.mockReset()
  mockTrackEvent.mockReset()
})

describe('useTracking', () => {
  test('trackPageview delegates to the plausible pageview call', () => {
    useTracking().trackPageview()
    expect(mockTrackPageview).toHaveBeenCalledOnce()
  })

  test('trackSignupStarted fires a "Signup Started" event with no second argument [obligation]', () => {
    useTracking().trackSignupStarted()
    expect(mockTrackEvent).toHaveBeenCalledWith('Signup Started')
    expect(mockTrackEvent.mock.calls[0]).toHaveLength(1)
  })

  test('trackSignupCompleted fires a "Signup Completed" event with no second argument [obligation]', () => {
    useTracking().trackSignupCompleted()
    expect(mockTrackEvent).toHaveBeenCalledWith('Signup Completed')
    expect(mockTrackEvent.mock.calls[0]).toHaveLength(1)
  })
})
