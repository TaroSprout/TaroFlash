import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import TaroPhoneBase from '@/components/taro-phone/taro-phone-base.vue'

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => ({ value: false })
}))

const AppLauncherStub = defineComponent({
  name: 'AppLauncher',
  setup: () => () => h('div', { 'data-testid': 'app-launcher-stub' })
})

function makeWrapper() {
  return mount(TaroPhoneBase, {
    global: { stubs: { AppLauncher: AppLauncherStub } }
  })
}

describe('TaroPhoneBase', () => {
  test('renders the app launcher', () => {
    const wrapper = makeWrapper()
    expect(wrapper.findComponent(AppLauncherStub).exists()).toBe(true)
  })

  test('emits close when the close button is pressed', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="phone"] button').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
