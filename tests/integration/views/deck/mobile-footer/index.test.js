import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'

const { claimHeightMock, releaseHeightMock } = vi.hoisted(() => ({
  claimHeightMock: vi.fn(),
  releaseHeightMock: vi.fn()
}))
vi.mock('@/components/mobile-dock/use-mobile-dock', () => ({
  useMobileDock: () => ({ claimHeight: claimHeightMock, releaseHeight: releaseHeightMock })
}))

const MobileDockStub = defineComponent({
  name: 'MobileDock',
  setup:
    (_p, { slots }) =>
    () =>
      h('div', { 'data-testid': 'mobile-dock-stub' }, slots.default?.())
})

const CrossfadeResizeStub = defineComponent({
  name: 'CrossfadeResize',
  emits: ['swap-start', 'swap-end'],
  setup:
    (_p, { slots, attrs, emit }) =>
    () =>
      h('div', { ...attrs }, [
        h('button', {
          'data-testid': 'crossfade-resize-stub__swap-start',
          onClick: () => emit('swap-start')
        }),
        h('button', {
          'data-testid': 'crossfade-resize-stub__swap-end',
          onClick: () => emit('swap-end')
        }),
        slots.default?.()
      ])
})

const MobilePageSettingsStub = defineComponent({
  name: 'MobilePageSettings',
  setup: () => () => h('div', { 'data-testid': 'mobile-page-settings-stub' })
})

const FooterActionsStub = defineComponent({
  name: 'FooterActions',
  setup: () => () => h('div', { 'data-testid': 'footer-actions-stub' })
})

const FooterBulkActionsStub = defineComponent({
  name: 'FooterBulkActions',
  setup: () => () => h('div', { 'data-testid': 'footer-bulk-actions-stub' })
})

const FooterImportStub = defineComponent({
  name: 'FooterImport',
  setup: () => () => h('div', { 'data-testid': 'footer-import-stub' })
})

import MobileFooter from '@/views/deck/mobile-footer/index.vue'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'
import { cardEditorKey } from '@/views/deck/composables'
import { cardImportKey } from '@/views/deck/composables/card-import'

function mount({
  page_settings_open = false,
  is_selecting = false,
  mode = 'view',
  is_expanded = ref(true),
  attachTo
} = {}) {
  const is_expanded_ref = typeof is_expanded === 'object' ? is_expanded : ref(is_expanded)
  return shallowMount(MobileFooter, {
    attachTo,
    global: {
      provide: {
        [deckViewShellKey]: { is_page_settings_open: ref(page_settings_open), mode: ref(mode) },
        [cardEditorKey]: { selection: { is_selecting: ref(is_selecting) } },
        [cardImportKey]: { is_expanded: is_expanded_ref }
      },
      stubs: {
        MobileDock: MobileDockStub,
        CrossfadeResize: CrossfadeResizeStub,
        MobilePageSettings: MobilePageSettingsStub,
        FooterActions: FooterActionsStub,
        FooterBulkActions: FooterBulkActionsStub,
        FooterImport: FooterImportStub
      }
    }
  })
}

describe('mobile-footer/index', () => {
  test('wires crossfade-resize swap-start/swap-end to claimHeight/releaseHeight [obligation]', async () => {
    claimHeightMock.mockClear()
    releaseHeightMock.mockClear()
    const wrapper = mount()

    await wrapper.find('[data-testid="crossfade-resize-stub__swap-start"]').trigger('click')
    expect(claimHeightMock).toHaveBeenCalledOnce()

    await wrapper.find('[data-testid="crossfade-resize-stub__swap-end"]').trigger('click')
    expect(releaseHeightMock).toHaveBeenCalledOnce()
  })

  test('renders footer-import under a stable key — the same node persists across an is_expanded flip [obligation]', async () => {
    const is_expanded = ref(true)
    const wrapper = mount({ mode: 'import', is_expanded, attachTo: document.body })

    const before = wrapper.find('[data-testid="footer-import-stub"]').element

    is_expanded.value = false
    await nextTick()

    const after = wrapper.find('[data-testid="footer-import-stub"]').element
    expect(after).toBe(before)

    wrapper.unmount()
  })

  test('shows footer-actions by default (nothing open)', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="footer-actions-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mobile-page-settings-stub"]').exists()).toBe(false)
  })

  test('shows mobile-page-settings when is_page_settings_open is true [obligation]', () => {
    const wrapper = mount({ page_settings_open: true })
    expect(wrapper.find('[data-testid="mobile-page-settings-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="footer-actions-stub"]').exists()).toBe(false)
  })

  test('shows footer-bulk-actions when selecting', () => {
    const wrapper = mount({ is_selecting: true })
    expect(wrapper.find('[data-testid="footer-bulk-actions-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="footer-actions-stub"]').exists()).toBe(false)
  })

  test('bulk-actions takes priority over page settings when both are open [obligation]', () => {
    const wrapper = mount({ is_selecting: true, page_settings_open: true })
    expect(wrapper.find('[data-testid="footer-bulk-actions-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mobile-page-settings-stub"]').exists()).toBe(false)
  })

  test('shows footer-import when shell.mode is import [obligation]', () => {
    const wrapper = mount({ mode: 'import' })
    expect(wrapper.find('[data-testid="footer-import-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="footer-actions-stub"]').exists()).toBe(false)
  })

  test('bulk-actions takes priority over import mode when both apply [obligation]', () => {
    const wrapper = mount({ is_selecting: true, mode: 'import' })
    expect(wrapper.find('[data-testid="footer-bulk-actions-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="footer-import-stub"]').exists()).toBe(false)
  })
})
