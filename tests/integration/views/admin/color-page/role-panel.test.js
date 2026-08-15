import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import RolePanel from '@/views/admin/color-page/role-panel.vue'
import { ROLE_NAMES, makeTuner } from './fixtures'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }))

const tuner = makeTuner()

vi.mock('@/views/admin/color-page/use-color-tuner', () => ({
  injectColorTuner: () => tuner
}))

beforeEach(() => {
  tuner.setRole.mockClear()
  tuner.stepRole.mockClear()
  tuner.addShade.mockClear()
  tuner.beginRun.mockClear()
  tuner.endRun.mockClear()
  tuner.readRole.mockImplementation((mode, station, role) => ({
    role,
    shade: tuner.shadeOf('brown-100'),
    ground: tuner.shadeOf('brown-200'),
    status: 'shipped',
    ratio: 6.5,
    floor: 4.5,
    flagged: false,
    steps: 2,
    can_step_up: true,
    can_step_down: true
  }))
})

function mountPanel(props = {}) {
  return mount(RolePanel, { props: { mode: 'light', station: 'page', ...props } })
}

describe('RolePanel — rows', () => {
  test('renders one row per role', () => {
    const wrapper = mountPanel()
    expect(wrapper.findAll('[data-testid^="role-panel__row--"]')).toHaveLength(ROLE_NAMES.length)
  })

  test('flags a row whose reading is flagged', () => {
    tuner.readRole.mockImplementation((mode, station, role) => ({
      role,
      shade: null,
      ground: null,
      status: 'shipped',
      ratio: 2,
      floor: 4.5,
      flagged: true,
      steps: null,
      can_step_up: false,
      can_step_down: false
    }))
    const wrapper = mountPanel()
    expect(
      wrapper.find(`[data-testid="role-panel__row--${ROLE_NAMES[0]}"]`).attributes('data-flagged')
    ).toBe('true')
  })
})

describe('RolePanel — step buttons', () => {
  test('step-up calls stepRole with direction 1', async () => {
    const wrapper = mountPanel()
    await wrapper.find('[data-testid="role-panel__step-up"]').trigger('click')

    expect(tuner.stepRole).toHaveBeenCalledWith('light', 'page', ROLE_NAMES[0], 1)
  })

  test('step-down calls stepRole with direction -1', async () => {
    const wrapper = mountPanel()
    await wrapper.find('[data-testid="role-panel__step-down"]').trigger('click')

    expect(tuner.stepRole).toHaveBeenCalledWith('light', 'page', ROLE_NAMES[0], -1)
  })

  test('step buttons disable when the reading forbids that direction', () => {
    tuner.readRole.mockImplementation((mode, station, role) => ({
      role,
      shade: null,
      ground: null,
      status: 'unanswered',
      ratio: null,
      floor: null,
      flagged: false,
      steps: null,
      can_step_up: false,
      can_step_down: false
    }))
    const wrapper = mountPanel()
    expect(wrapper.find('[data-testid="role-panel__step-up"]').attributes('disabled')).toBeDefined()
    expect(
      wrapper.find('[data-testid="role-panel__step-down"]').attributes('disabled')
    ).toBeDefined()
  })
})

describe('RolePanel — pick select', () => {
  test('picking an existing shade calls setRole with its id', async () => {
    const wrapper = mountPanel()
    const [select] = wrapper.findAll(`[data-testid="role-panel__pick--${ROLE_NAMES[0]}"]`)
    await select.setValue('brown-200')

    expect(tuner.setRole).toHaveBeenCalledWith('light', 'page', ROLE_NAMES[0], 'brown-200')
  })

  test('picking the blank option calls setRole with null', async () => {
    const wrapper = mountPanel()
    const select = wrapper.find(`[data-testid="role-panel__pick--${ROLE_NAMES[0]}"]`)
    await select.setValue('')

    expect(tuner.setRole).toHaveBeenCalledWith('light', 'page', ROLE_NAMES[0], null)
  })

  test('picking "new shade" runs addShade + setRole inside one beginRun/endRun span', async () => {
    const wrapper = mountPanel()
    const select = wrapper.find(`[data-testid="role-panel__pick--${ROLE_NAMES[0]}"]`)
    const options = select.findAll('option')
    await select.setValue(options.at(-1).element.value)

    expect(tuner.beginRun).toHaveBeenCalledTimes(1)
    expect(tuner.addShade).toHaveBeenCalledTimes(1)
    expect(tuner.setRole).toHaveBeenCalledTimes(1)
    expect(tuner.endRun).toHaveBeenCalledTimes(1)
  })
})

describe('RolePanel — close', () => {
  test('clicking close emits close', async () => {
    const wrapper = mountPanel()
    await wrapper.find('[data-testid="role-panel__close"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
