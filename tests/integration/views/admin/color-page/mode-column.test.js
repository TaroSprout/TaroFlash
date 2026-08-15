import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import ModeColumn from '@/views/admin/color-page/mode-column.vue'
import { makeTuner } from './fixtures'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }))

const tuner = makeTuner()

vi.mock('@/views/admin/color-page/use-color-tuner', () => ({
  injectColorTuner: () => tuner
}))

const StationPreviewStub = defineComponent({
  name: 'StationPreview',
  props: ['mode', 'station', 'open'],
  emits: ['open-roles'],
  setup(props, { emit }) {
    return () =>
      h('button', {
        'data-testid': `station-stub__${props.station}`,
        onClick: (event) => emit('open-roles', event.currentTarget)
      })
  }
})

beforeEach(() => {
  tuner.setBackdrop.mockClear()
  tuner.state.value.backdrops = { light: null, dark: null }
})

function mountColumn(props = {}) {
  return mount(ModeColumn, {
    props: { mode: 'light', open_station: null, ...props },
    global: { stubs: { StationPreview: StationPreviewStub } }
  })
}

describe('ModeColumn — rendering', () => {
  test('renders one station preview per STATIONS entry', () => {
    const wrapper = mountColumn()
    expect(wrapper.findAllComponents(StationPreviewStub)).toHaveLength(4)
  })
})

describe('ModeColumn — backdrop select', () => {
  test('follows the tuner backdrop value for the mode', () => {
    tuner.state.value.backdrops.light = 'brown-200'
    const wrapper = mountColumn()
    expect(wrapper.find('[data-testid="mode-column__backdrop"]').element.value).toBe('brown-200')
  })

  test('changing the select calls setBackdrop with the picked shade id', async () => {
    const wrapper = mountColumn()
    await wrapper.find('[data-testid="mode-column__backdrop"]').setValue('brown-100')

    expect(tuner.setBackdrop).toHaveBeenCalledWith('light', 'brown-100')
  })

  test('picking "follow" calls setBackdrop with null', async () => {
    const wrapper = mountColumn()
    await wrapper.find('[data-testid="mode-column__backdrop"]').setValue('')

    expect(tuner.setBackdrop).toHaveBeenCalledWith('light', null)
  })
})

describe('ModeColumn — open-roles forwarding', () => {
  test('forwards a station open-roles event with the station name added', async () => {
    const wrapper = mountColumn()
    await wrapper.find('[data-testid="station-stub__panel"]').trigger('click')

    const emitted = wrapper.emitted('open-roles')
    expect(emitted).toHaveLength(1)
    expect(emitted[0][0]).toBe('panel')
  })
})
