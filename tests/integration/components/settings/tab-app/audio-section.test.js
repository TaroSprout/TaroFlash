import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { memberEditorKey } from '@/composables/member/editor'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx, mockPreviewMemberVolumes, mockDiscardVolumePreview } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockPreviewMemberVolumes: vi.fn(),
  mockDiscardVolumePreview: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))
vi.mock('@/sfx/volume-seam', () => ({
  previewMemberVolumes: mockPreviewMemberVolumes,
  discardVolumePreview: mockDiscardVolumePreview
}))

import AudioSection from '@/views/settings/tab-app/audio-section.vue'
import UiSlider from '@/components/ui-kit/slider.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEditor(overrides = {}) {
  return {
    draft: reactive({
      preferences: {
        audio: {
          muted: false,
          interface_sounds: 5,
          hover_sounds: 5,
          ...overrides
        }
      }
    })
  }
}

function mountSection(editor = makeEditor()) {
  const wrapper = mount(AudioSection, {
    attachTo: document.body,
    global: {
      provide: { [memberEditorKey]: editor }
    }
  })
  return { wrapper, editor }
}

beforeEach(() => {
  mockEmitSfx.mockClear()
  mockPreviewMemberVolumes.mockClear()
  mockDiscardVolumePreview.mockClear()
})

describe('AudioSection', () => {
  test('renders the mute-all toggle and both sliders', () => {
    const { wrapper } = mountSection()
    expect(wrapper.find('[data-testid="tab-app__mute-all"]').exists()).toBe(true)
    expect(wrapper.findAllComponents(UiSlider)).toHaveLength(2)
  })

  // ── preview_bus routes the drag to the bus the slider itself sets [obligation] ──

  test('the interface-sounds slider passes preview_bus="interface" [obligation]', () => {
    const { wrapper } = mountSection()
    const sliders = wrapper.findAllComponents(UiSlider)
    expect(sliders[0].props('preview_bus')).toBe('interface')
  })

  test('the hover-sounds slider passes preview_bus="hover" [obligation]', () => {
    const { wrapper } = mountSection()
    const sliders = wrapper.findAllComponents(UiSlider)
    expect(sliders[1].props('preview_bus')).toBe('hover')
  })

  test('changing interface_sounds live-previews the volume without muting [obligation]', async () => {
    const { editor } = mountSection()
    editor.draft.preferences.audio.interface_sounds = 8
    await Promise.resolve()

    expect(mockPreviewMemberVolumes).toHaveBeenCalledWith({
      muted: false,
      interface_sounds: 8,
      hover_sounds: 5
    })
  })

  test('unmounting discards the volume preview', () => {
    const { wrapper } = mountSection()
    wrapper.unmount()
    expect(mockDiscardVolumePreview).toHaveBeenCalledOnce()
  })
})
