import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import FeedbackApp from '@/components/taro-phone/apps/feedback-app.vue'

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => ({ value: false })
}))

describe('FeedbackApp — stub [obligation]', () => {
  test('renders the phone-app trigger with no handler wired', () => {
    const wrapper = mount(FeedbackApp)
    expect(wrapper.find('[data-testid="phone-app"]').exists()).toBe(true)
  })
})
