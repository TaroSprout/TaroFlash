import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import StudyEditFooter from '@/components/flashcard-session/session-studying/study-edit-footer.vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

function mountFooter(props = {}) {
  return mount(StudyEditFooter, { props: { is_starting_side: true, ...props } })
}

describe('StudyEditFooter', () => {
  test('renders the flip and done buttons', () => {
    const wrapper = mountFooter()
    expect(wrapper.find('[data-testid="study-card-edit__flip"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="study-card-edit__done"]').exists()).toBe(true)
  })

  test('clicking flip emits "flip"', async () => {
    const wrapper = mountFooter()
    await wrapper.find('[data-testid="study-card-edit__flip"]').trigger('click')
    expect(wrapper.emitted('flip')).toHaveLength(1)
  })

  test('clicking done emits "done"', async () => {
    const wrapper = mountFooter()
    await wrapper.find('[data-testid="study-card-edit__done"]').trigger('click')
    expect(wrapper.emitted('done')).toHaveLength(1)
  })

  test('clicking flip plays transition_up when on the starting side', async () => {
    const wrapper = mountFooter({ is_starting_side: true })
    await wrapper.find('[data-testid="study-card-edit__flip"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('transition_up', undefined)
  })

  test('clicking flip plays transition_down when not on the starting side', async () => {
    const wrapper = mountFooter({ is_starting_side: false })
    await wrapper.find('[data-testid="study-card-edit__flip"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('transition_down', undefined)
  })

  test('clicking done plays music_plink_ok', async () => {
    const wrapper = mountFooter()
    await wrapper.find('[data-testid="study-card-edit__done"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('music_plink_ok', undefined)
  })
})
