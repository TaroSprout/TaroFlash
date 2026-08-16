import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import RoleEditor from '@/views/admin/color-page/role-editor.vue'
import UiSelectMenu from '@/components/ui-kit/select-menu.vue'
import { colorTunerKey, useColorTuner } from '@/views/admin/color-page/use-color-tuner'

const wrappers = []

function mountEditor(props, tuner = useColorTuner()) {
  const Host = defineComponent({
    setup() {
      return () => h(RoleEditor, { mode: 'light', station: 'page', role: 'ink', ...props })
    }
  })

  const wrapper = mount(Host, {
    global: { provide: { [colorTunerKey]: tuner } },
    attachTo: document.body
  })
  wrappers.push(wrapper)
  return { wrapper, tuner }
}

describe('RoleEditor', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    document.body.innerHTML = ''
  })

  test('shows the WCAG ratio for the current binding', () => {
    const { wrapper, tuner } = mountEditor()
    const reading = tuner.readRole('light', 'page', 'ink')

    expect(wrapper.find('[data-testid="role-editor__wcag"]').text()).toContain(
      reading.ratio.toFixed(2)
    )
  })

  test('flags the WCAG reading once the binding drops below its floor', async () => {
    const tuner = useColorTuner()
    // Recolour ink to match the surface it's read against — collapses the ratio under the 4.5:1 floor.
    const surface_hsl = tuner.shadeOf(tuner.roleId('light', 'page', 'surface')).hsl
    const ink_id = tuner.roleId('light', 'page', 'ink')
    tuner.setChannel(ink_id, 'h', surface_hsl.h)
    tuner.setChannel(ink_id, 's', surface_hsl.s)
    tuner.setChannel(ink_id, 'l', surface_hsl.l)

    const { wrapper } = mountEditor({}, tuner)

    expect(wrapper.find('[data-testid="role-editor__wcag"]').attributes('data-flagged')).toBe(
      'true'
    )
  })

  test('clicking lighter nudges the role to its lighter neighbour', async () => {
    // 'ink' at light/page -> brown-700, which has a lighter neighbour in the brown family.
    const { wrapper, tuner } = mountEditor({ mode: 'light', station: 'page', role: 'ink' })
    const before = tuner.roleId('light', 'page', 'ink')

    await wrapper.find('[data-testid="role-editor__lighter"]').trigger('click')

    expect(tuner.roleId('light', 'page', 'ink')).not.toBe(before)
  })

  test('clicking darker nudges the role to its darker neighbour', async () => {
    const { wrapper, tuner } = mountEditor({ mode: 'light', station: 'page', role: 'well' })
    const before = tuner.roleId('light', 'page', 'well')

    await wrapper.find('[data-testid="role-editor__darker"]').trigger('click')

    expect(tuner.roleId('light', 'page', 'well')).not.toBe(before)
  })

  test('at the end of a family the mint button renders instead of a nudge button, and mints on click', async () => {
    // dark/panel/line -> black, the last shade in the 2-member base family — no darker neighbour.
    const { wrapper, tuner } = mountEditor({ mode: 'dark', station: 'panel', role: 'line' })

    expect(wrapper.find('[data-testid="role-editor__darker"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="role-editor__mint-darker"]').exists()).toBe(true)

    const before_count = tuner.shades.value.length
    await wrapper.find('[data-testid="role-editor__mint-darker"]').trigger('click')

    expect(tuner.shades.value.length).toBe(before_count + 1)
  })

  test('the select menu carries the current binding as its modelValue', () => {
    const { wrapper, tuner } = mountEditor({ mode: 'light', station: 'page', role: 'ink' })
    const select = wrapper.findComponent(UiSelectMenu)

    expect(select.props('modelValue')).toBe(tuner.roleId('light', 'page', 'ink'))
  })

  test('choosing a different shade in the select menu rebinds the role', async () => {
    const { wrapper, tuner } = mountEditor({ mode: 'light', station: 'page', role: 'ink' })
    const select = wrapper.findComponent(UiSelectMenu)
    const alternative = tuner.neutral_shades.value.find(
      (shade) => shade.id !== tuner.roleId('light', 'page', 'ink')
    )

    select.vm.$emit('update:modelValue', alternative.id)
    await wrapper.vm.$nextTick()

    expect(tuner.roleId('light', 'page', 'ink')).toBe(alternative.id)
  })
})
