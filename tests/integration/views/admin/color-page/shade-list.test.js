import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import ShadeList from '@/views/admin/color-page/shade-list.vue'
import { makeTuner } from './fixtures'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }))

const tuner = makeTuner()

vi.mock('@/views/admin/color-page/use-color-tuner', () => ({
  injectColorTuner: () => tuner
}))

beforeEach(() => {
  tuner.renameShade.mockClear()
  tuner.renameShade.mockReturnValue(true)
  tuner.recolorShade.mockClear()
  tuner.beginRun.mockClear()
  tuner.endRun.mockClear()
  tuner.addShade.mockClear()
  tuner.resetShade.mockClear()
  tuner.deleteShade.mockClear()
  tuner.canResetShade.mockReturnValue(false)
  tuner.usageCount.mockReturnValue(0)
})

function mountList() {
  return mount(ShadeList)
}

describe('ShadeList — families', () => {
  test('renders one family group with a shade row for each shade', () => {
    const wrapper = mountList()
    expect(wrapper.find('[data-testid="shade-list__family--brown"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="shade-list__shade--brown-100"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="shade-list__shade--brown-200"]').exists()).toBe(true)
  })

  test('adding a shade calls addShade with the family', async () => {
    const wrapper = mountList()
    await wrapper.find('[data-testid="shade-list__add"]').trigger('click')

    expect(tuner.addShade).toHaveBeenCalledWith('brown', { h: 0, s: 0, l: 50 })
  })
})

describe('ShadeList — editor toggle', () => {
  test('the editor is closed by default', () => {
    const wrapper = mountList()
    expect(wrapper.find('[data-testid="shade-list__editor"]').exists()).toBe(false)
  })

  test('clicking a shade name opens its editor', async () => {
    const wrapper = mountList()
    const toggles = wrapper.findAll('[data-testid="shade-list__toggle"]')
    await toggles[0].trigger('click')

    expect(wrapper.findAll('[data-testid="shade-list__editor"]')).toHaveLength(1)
  })

  test('clicking the same shade name again closes the editor', async () => {
    const wrapper = mountList()
    const toggles = wrapper.findAll('[data-testid="shade-list__toggle"]')
    await toggles[0].trigger('click')
    await toggles[0].trigger('click')

    expect(wrapper.find('[data-testid="shade-list__editor"]').exists()).toBe(false)
  })
})

describe('ShadeList — rename', () => {
  test('changing the name field calls renameShade with the trimmed value', async () => {
    const wrapper = mountList()
    await wrapper.find('[data-testid="shade-list__toggle"]').trigger('click')

    const input = wrapper.find('[data-testid="shade-list__name"]')
    await input.setValue('new-name')
    await input.trigger('change')

    expect(tuner.renameShade).toHaveBeenCalledWith('brown-100', 'new-name')
  })

  test('a rejected rename shows the name-taken error', async () => {
    tuner.renameShade.mockReturnValue(false)
    const wrapper = mountList()
    await wrapper.find('[data-testid="shade-list__toggle"]').trigger('click')

    const input = wrapper.find('[data-testid="shade-list__name"]')
    await input.setValue('brown-200')
    await input.trigger('change')

    expect(wrapper.find('[data-testid="shade-list__name-error"]').exists()).toBe(true)
  })
})

describe('ShadeList — channel inputs', () => {
  test('editing a channel opens a run and calls recolorShade with the new value', async () => {
    const wrapper = mountList()
    await wrapper.find('[data-testid="shade-list__toggle"]').trigger('click')

    const hue = wrapper.find('[data-testid="shade-list__channel--h"]')
    await hue.setValue(120)

    expect(tuner.beginRun).toHaveBeenCalledTimes(1)
    expect(tuner.recolorShade).toHaveBeenCalledWith('brown-100', { h: 120, s: 30, l: 92 })
  })

  test('blurring a channel input closes the run', async () => {
    const wrapper = mountList()
    await wrapper.find('[data-testid="shade-list__toggle"]').trigger('click')

    const hue = wrapper.find('[data-testid="shade-list__channel--h"]')
    await hue.trigger('blur')

    expect(tuner.endRun).toHaveBeenCalledTimes(1)
  })
})

describe('ShadeList — reset and delete', () => {
  test('the reset button is hidden when canResetShade is false', async () => {
    const wrapper = mountList()
    await wrapper.find('[data-testid="shade-list__toggle"]').trigger('click')

    expect(wrapper.find('[data-testid="shade-list__reset"]').exists()).toBe(false)
  })

  test('clicking reset calls resetShade when canResetShade is true', async () => {
    tuner.canResetShade.mockReturnValue(true)
    const wrapper = mountList()
    await wrapper.find('[data-testid="shade-list__toggle"]').trigger('click')
    await wrapper.find('[data-testid="shade-list__reset"]').trigger('click')

    expect(tuner.resetShade).toHaveBeenCalledWith('brown-100')
  })

  test('delete is disabled and shows the blocked count when usageCount > 0', async () => {
    tuner.usageCount.mockReturnValue(2)
    const wrapper = mountList()
    await wrapper.find('[data-testid="shade-list__toggle"]').trigger('click')

    expect(wrapper.find('[data-testid="shade-list__delete"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="shade-list__delete-blocked"]').exists()).toBe(true)
  })

  test('clicking delete calls deleteShade when unused', async () => {
    const wrapper = mountList()
    await wrapper.find('[data-testid="shade-list__toggle"]').trigger('click')
    await wrapper.find('[data-testid="shade-list__delete"]').trigger('click')

    expect(tuner.deleteShade).toHaveBeenCalledWith('brown-100')
  })
})
