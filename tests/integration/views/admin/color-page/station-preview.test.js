import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import StationPreview from '@/views/admin/color-page/station-preview.vue'
import { makeTuner } from './fixtures'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key) })
}))

const tuner = makeTuner()

vi.mock('@/views/admin/color-page/use-color-tuner', () => ({
  injectColorTuner: () => tuner
}))

const PaintTargetStub = defineComponent({
  name: 'PaintTarget',
  props: ['elementId', 'element_id', 'mode', 'station', 'tag'],
  setup(props, { slots }) {
    return () =>
      h(
        props.tag ?? 'div',
        { 'data-testid': `paint-target-stub__${props.element_id}` },
        slots.default?.()
      )
  }
})

beforeEach(() => {
  tuner.unansweredCount.mockReturnValue(0)
})

function mountPreview(props = {}) {
  return mount(StationPreview, {
    props: { mode: 'light', station: 'page', open: false, ...props },
    global: { stubs: { PaintTarget: PaintTargetStub } }
  })
}

describe('StationPreview — unanswered badge', () => {
  test('hides the unanswered badge when the count is zero', () => {
    const wrapper = mountPreview()
    expect(wrapper.find('[data-testid="station-preview__unanswered"]').exists()).toBe(false)
  })

  test('shows the unanswered badge when the count is above zero', () => {
    tuner.unansweredCount.mockReturnValue(3)
    const wrapper = mountPreview()
    expect(wrapper.find('[data-testid="station-preview__unanswered"]').exists()).toBe(true)
  })
})

describe('StationPreview — roles button', () => {
  test('marks the roles button active when open', () => {
    const wrapper = mountPreview({ open: true })
    expect(
      wrapper.find('[data-testid="station-preview__roles-button"]').attributes('data-active')
    ).toBe('true')
  })

  test('clicking the roles button emits open-roles with the click target', async () => {
    const wrapper = mountPreview()
    await wrapper.find('[data-testid="station-preview__roles-button"]').trigger('click')

    expect(wrapper.emitted('open-roles')).toHaveLength(1)
  })
})

describe('StationPreview — preview elements', () => {
  test('renders every preview element as a paint target', () => {
    const wrapper = mountPreview()
    const ids = [
      'canvas',
      'title',
      'subtitle',
      'field',
      'action',
      'action-caret',
      'chip',
      'rule',
      'placeholder',
      'placeholder-sweep'
    ]
    for (const id of ids) {
      expect(wrapper.find(`[data-testid="paint-target-stub__${id}"]`).exists()).toBe(true)
    }
  })
})
