import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import SessionToolbar from '@/views/study-session/session-toolbar.vue'

function mountToolbar(variant, props = {}) {
  return shallowMount(SessionToolbar, {
    props: { variant, prefs_are_default: true, ...props },
    global: { renderStubDefaultSlot: true }
  })
}

describe('session-toolbar', () => {
  test('variant="rating" renders rating-buttons', () => {
    const wrapper = mountToolbar('rating')
    expect(wrapper.findComponent({ name: 'RatingButtons' }).exists()).toBe(true)
  })

  test("rating-buttons started forwards to the toolbar's own started emit", async () => {
    const wrapper = mountToolbar('rating')
    await wrapper.findComponent({ name: 'RatingButtons' }).vm.$emit('started')
    expect(wrapper.emitted('started')).toHaveLength(1)
  })

  test("study-flip-done-footer flip/done forward to the toolbar's own emits", async () => {
    const wrapper = mountToolbar('edit')
    const footer = wrapper.findComponent({ name: 'StudyFlipDoneFooter' })
    await footer.vm.$emit('flip')
    await footer.vm.$emit('done')
    expect(wrapper.emitted('flip')).toHaveLength(1)
    expect(wrapper.emitted('done')).toHaveLength(1)
  })

  test('variant="edit" renders study-flip-done-footer', () => {
    const wrapper = mountToolbar('edit')
    expect(wrapper.findComponent({ name: 'StudyFlipDoneFooter' }).exists()).toBe(true)
  })

  test('variant="settings-reset" renders the reset button, disabled when prefs are default', () => {
    const wrapper = mountToolbar('settings-reset', { prefs_are_default: true })
    const button = wrapper.find('[data-testid="session-settings__reset"]')
    expect(button.exists()).toBe(true)
    expect(button.attributes('disabled')).toBe('true')
  })

  test('variant="settings-reset" enables the reset button when prefs differ from default', () => {
    const wrapper = mountToolbar('settings-reset', { prefs_are_default: false })
    const button = wrapper.find('[data-testid="session-settings__reset"]')
    expect(button.attributes('disabled')).toBe('false')
  })

  test('variant="summary-edit" renders study-flip-done-footer', () => {
    const wrapper = mountToolbar('summary-edit')
    expect(wrapper.findComponent({ name: 'StudyFlipDoneFooter' }).exists()).toBe(true)
  })

  test('variant="summary-edit" flip/done forward to the toolbar\'s own emits', async () => {
    const wrapper = mountToolbar('summary-edit')
    const footer = wrapper.findComponent({ name: 'StudyFlipDoneFooter' })
    await footer.vm.$emit('flip')
    await footer.vm.$emit('done')
    expect(wrapper.emitted('flip')).toHaveLength(1)
    expect(wrapper.emitted('done')).toHaveLength(1)
  })

  test('variant="bulk" renders summary-bulk-actions-bar', () => {
    const wrapper = mountToolbar('bulk')
    expect(wrapper.findComponent({ name: 'SummaryBulkActionsBar' }).exists()).toBe(true)
  })

  test('variant="category-close" renders its own close button', () => {
    const wrapper = mountToolbar('category-close')
    expect(wrapper.find('[data-testid="session-summary-category__close"]').exists()).toBe(true)
  })

  test('variant="summary-close" (fallback) renders the summary close button', () => {
    const wrapper = mountToolbar('summary-close')
    expect(wrapper.find('[data-testid="session-summary__close"]').exists()).toBe(true)
  })

  // ── emits ──────────────────────────────────────────────────────

  test('reset button press emits reset', async () => {
    const wrapper = mountToolbar('settings-reset', { prefs_are_default: false })
    await wrapper.find('[data-testid="session-settings__reset"]').trigger('press')
    expect(wrapper.emitted('reset')).toHaveLength(1)
  })

  test('category-close button press emits close', async () => {
    const wrapper = mountToolbar('category-close')
    await wrapper.find('[data-testid="session-summary-category__close"]').trigger('press')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('summary-close (fallback) button press emits close', async () => {
    const wrapper = mountToolbar('summary-close')
    await wrapper.find('[data-testid="session-summary__close"]').trigger('press')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
