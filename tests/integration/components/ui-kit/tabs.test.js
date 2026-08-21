import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import UiTabs from '@/components/ui-kit/tabs.vue'

const { mockEmitSfx, mockEmitHoverSfx } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockEmitHoverSfx: vi.fn()
}))
vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: mockEmitHoverSfx
}))

const { mockStorageGet, mockStorageSet } = vi.hoisted(() => ({
  mockStorageGet: vi.fn(),
  mockStorageSet: vi.fn()
}))
vi.mock('@/utils/storage', () => ({
  default: { get: mockStorageGet, set: mockStorageSet }
}))

const TABS = [{ label: 'General' }, { label: 'Design' }, { label: 'Danger zone' }]

function mountTabs(props = {}) {
  return mount(UiTabs, { props: { tabs: TABS, activeTab: 0, ...props } })
}

describe('UiTabs', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockEmitHoverSfx.mockClear()
    mockStorageGet.mockReset()
    mockStorageSet.mockClear()
  })

  test('clicking a non-active tab emits ui.select sfx and update:activeTab', async () => {
    const wrapper = mountTabs()
    const tabs = wrapper.findAll('[data-testid="ui-kit-tabs__tab"]')

    await tabs[1].trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('ui.select')
    expect(wrapper.emitted('update:activeTab')).toEqual([[1]])
  })

  test('clicking the active tab emits neither sfx nor update:activeTab', async () => {
    const wrapper = mountTabs({ activeTab: 0 })
    const tabs = wrapper.findAll('[data-testid="ui-kit-tabs__tab"]')

    await tabs[0].trigger('click')

    expect(mockEmitSfx).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:activeTab')).toBeUndefined()
  })

  test('clicking a tab persists the new index to storage when storageKey is set', async () => {
    const wrapper = mountTabs({ storageKey: 'deck-settings-tab' })
    const tabs = wrapper.findAll('[data-testid="ui-kit-tabs__tab"]')

    await tabs[2].trigger('click')

    expect(mockStorageSet).toHaveBeenCalledWith('deck-settings-tab', '2')
  })

  test('clicking a tab does not touch storage when storageKey is unset', async () => {
    const wrapper = mountTabs()
    const tabs = wrapper.findAll('[data-testid="ui-kit-tabs__tab"]')

    await tabs[1].trigger('click')

    expect(mockStorageSet).not.toHaveBeenCalled()
  })

  test('hovering a non-active tab emits ui.hover sfx', async () => {
    const wrapper = mountTabs({ activeTab: 0 })
    const tabs = wrapper.findAll('[data-testid="ui-kit-tabs__tab"]')

    await tabs[1].trigger('mouseenter')

    expect(mockEmitHoverSfx).toHaveBeenCalledWith('ui.hover')
  })

  test('hovering the active tab emits no hover sfx', async () => {
    const wrapper = mountTabs({ activeTab: 0 })
    const tabs = wrapper.findAll('[data-testid="ui-kit-tabs__tab"]')

    await tabs[0].trigger('mouseenter')

    expect(mockEmitHoverSfx).not.toHaveBeenCalled()
  })
})
