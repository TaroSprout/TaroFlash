import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import FeedbackApp from '@/components/taro-phone/apps/feedback-app.vue'

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => ({ value: false })
}))

const { mockOpenApp, mockFeedbackModalOpen } = vi.hoisted(() => ({
  mockOpenApp: vi.fn(),
  mockFeedbackModalOpen: vi.fn()
}))

vi.mock('@/stores/taro-phone', () => ({
  useTaroPhoneStore: () => ({ openApp: mockOpenApp })
}))

vi.mock('@/composables/feedback/use-feedback-modal', () => ({
  useFeedbackModal: () => ({ open: mockFeedbackModalOpen })
}))

describe('FeedbackApp — openApp wiring [obligation]', () => {
  test('pressing the app launches the feedback modal through phone.openApp', async () => {
    const modal_result = { response: Promise.resolve(undefined) }
    mockFeedbackModalOpen.mockReturnValueOnce(modal_result)

    const wrapper = mount(FeedbackApp)
    await wrapper.find('[data-testid="phone-app"]').trigger('click')

    expect(mockFeedbackModalOpen).toHaveBeenCalledOnce()
    expect(mockOpenApp).toHaveBeenCalledWith(modal_result)
  })
})
