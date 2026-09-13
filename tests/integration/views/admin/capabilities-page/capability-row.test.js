import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { motionStoreStub } from '@tests/fixtures/motion'
import CapabilityRow from '@/views/admin/capabilities-page/capability-row.vue'
import AvatarImage from '@/components/member/avatar-image.vue'

const {
  updateCapabilityMutate,
  addGrantMutate,
  removeGrantMutate,
  grantsData,
  grantsLoading,
  searchResultsData
} = vi.hoisted(() => ({
  updateCapabilityMutate: vi.fn(),
  addGrantMutate: vi.fn(),
  removeGrantMutate: vi.fn(),
  grantsData: { ref: null },
  grantsLoading: { ref: null },
  searchResultsData: { ref: null }
}))

vi.mock('@/api/capabilities', () => ({
  useUpdateCapabilityMutation: () => ({ mutate: updateCapabilityMutate }),
  useCapabilityGrantsQuery: () => ({ data: grantsData.ref, isLoading: grantsLoading.ref }),
  useAddCapabilityGrantMutation: () => ({ mutate: addGrantMutate }),
  useRemoveCapabilityGrantMutation: () => ({ mutate: removeGrantMutate })
}))

vi.mock('@/api/members', () => ({
  useMemberSearchQuery: () => ({ data: searchResultsData.ref })
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

vi.mock('@/stores/motion', () => ({ useMotionStore: () => motionStoreStub() }))

vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => ref(false) }))

function mountRow(item, overrides = {}) {
  grantsData.ref = ref(overrides.grants ?? [])
  grantsLoading.ref = ref(overrides.grants_loading ?? false)
  searchResultsData.ref = ref(overrides.search_results ?? [])

  return mount(CapabilityRow, { props: { item } })
}

function getStateOptions(wrapper) {
  return wrapper.findAll(
    '[data-testid="admin-capabilities-row__state"] [data-testid="ui-option-group__option"]'
  )
}

async function setSearchTerm(wrapper, term) {
  const matches = wrapper.findAll('[data-testid="admin-capabilities-row__search-input"]')
  await matches[matches.length - 1].setValue(term) // ui-input forwards the testid to its root label and its inner input alike; the input is always last
}

const MEMBER_A = {
  id: 'member-a',
  display_name: 'Ada Lovelace',
  avatar_url: null,
  email: 'ada@example.com'
}
const MEMBER_B = {
  id: 'member-b',
  display_name: 'Grace Hopper',
  avatar_url: null,
  email: 'grace@example.com'
}

beforeEach(() => {
  updateCapabilityMutate.mockClear()
  addGrantMutate.mockClear()
  removeGrantMutate.mockClear()
})

describe('CapabilityRow — state switching', () => {
  test('selecting "on" calls the update mutation with state on', async () => {
    const wrapper = mountRow({ key: 'audio_reader', state: 'off' })
    await getStateOptions(wrapper)[1].trigger('click')

    expect(updateCapabilityMutate).toHaveBeenCalledWith({ key: 'audio_reader', state: 'on' })
  })

  test('selecting "off" calls the update mutation with state off', async () => {
    const wrapper = mountRow({ key: 'audio_reader', state: 'on' })
    await getStateOptions(wrapper)[0].trigger('click')

    expect(updateCapabilityMutate).toHaveBeenCalledWith({ key: 'audio_reader', state: 'off' })
  })

  test('selecting "targeted" calls the update mutation with state targeted', async () => {
    const wrapper = mountRow({ key: 'audio_reader', state: 'off' })
    await getStateOptions(wrapper)[2].trigger('click')

    expect(updateCapabilityMutate).toHaveBeenCalledWith({ key: 'audio_reader', state: 'targeted' })
  })
})

describe('CapabilityRow — member editor visibility', () => {
  test('the editor is absent for an off row', () => {
    const wrapper = mountRow({ key: 'audio_reader', state: 'off' })
    expect(wrapper.find('[data-testid="admin-capabilities-row__editor"]').exists()).toBe(false)
  })

  test('the editor is absent for an on row', () => {
    const wrapper = mountRow({ key: 'audio_reader', state: 'on' })
    expect(wrapper.find('[data-testid="admin-capabilities-row__editor"]').exists()).toBe(false)
  })

  test('the editor is present for a targeted row', () => {
    const wrapper = mountRow({ key: 'audio_reader', state: 'targeted' })
    expect(wrapper.find('[data-testid="admin-capabilities-row__editor"]').exists()).toBe(true)
  })

  test('switching away from targeted hides the editor without dropping existing grants', async () => {
    const wrapper = mountRow(
      { key: 'audio_reader', state: 'targeted' },
      { grants: [{ id: 'member-a', display_name: 'Ada Lovelace', avatar_url: null }] }
    )

    expect(wrapper.find('[data-testid="admin-capabilities-row__granted-item"]').exists()).toBe(true)

    await getStateOptions(wrapper)[1].trigger('click')
    await wrapper.setProps({ item: { key: 'audio_reader', state: 'on' } })

    expect(wrapper.find('[data-testid="admin-capabilities-row__editor"]').exists()).toBe(false)
    expect(removeGrantMutate).not.toHaveBeenCalled()
    expect(grantsData.ref.value).toHaveLength(1)
  })
})

describe('CapabilityRow — search floor', () => {
  test('a query under two characters shows neither results nor the empty message', async () => {
    const wrapper = mountRow(
      { key: 'audio_reader', state: 'targeted' },
      { search_results: [MEMBER_A] }
    )

    await setSearchTerm(wrapper, 'a')

    expect(wrapper.find('[data-testid="admin-capabilities-row__search-results"]').exists()).toBe(
      false
    )
    expect(wrapper.find('[data-testid="admin-capabilities-row__no-results"]').exists()).toBe(false)
  })

  test('a query of two or more characters lists matches with avatar, name, and email', async () => {
    const wrapper = mountRow(
      { key: 'audio_reader', state: 'targeted' },
      { search_results: [MEMBER_A] }
    )

    await setSearchTerm(wrapper, 'ad')

    const result = wrapper.find('[data-testid="admin-capabilities-row__search-result"]')
    expect(result.exists()).toBe(true)
    expect(result.find('[data-testid="admin-capabilities-row__search-result-name"]').text()).toBe(
      'Ada Lovelace'
    )
    expect(result.find('[data-testid="admin-capabilities-row__search-result-email"]').text()).toBe(
      'ada@example.com'
    )
    expect(result.findComponent(AvatarImage).exists()).toBe(true)
  })

  test('a query of two or more characters with no matches shows the empty message', async () => {
    const wrapper = mountRow({ key: 'audio_reader', state: 'targeted' }, { search_results: [] })

    await setSearchTerm(wrapper, 'zz')

    expect(wrapper.find('[data-testid="admin-capabilities-row__no-results"]').exists()).toBe(true)
  })

  test('an already-granted member is excluded from the search results', async () => {
    const wrapper = mountRow(
      { key: 'audio_reader', state: 'targeted' },
      {
        grants: [{ id: MEMBER_A.id, display_name: MEMBER_A.display_name, avatar_url: null }],
        search_results: [MEMBER_A, MEMBER_B]
      }
    )

    await setSearchTerm(wrapper, 'ex')

    const names = wrapper
      .findAll('[data-testid="admin-capabilities-row__search-result-name"]')
      .map((n) => n.text())

    expect(names).toEqual(['Grace Hopper'])
  })
})

describe('CapabilityRow — grant mutations', () => {
  test('tapping a search result calls the add-grant mutation with the row key and member', async () => {
    const wrapper = mountRow(
      { key: 'audio_reader', state: 'targeted' },
      { search_results: [MEMBER_A] }
    )

    await setSearchTerm(wrapper, 'ad')
    await wrapper.find('[data-testid="admin-capabilities-row__search-result"]').trigger('click')

    expect(addGrantMutate).toHaveBeenCalledWith({
      key: 'audio_reader',
      member: {
        id: MEMBER_A.id,
        display_name: MEMBER_A.display_name,
        avatar_url: MEMBER_A.avatar_url
      }
    })
  })

  test('tapping remove on a granted row calls the remove-grant mutation with the row key and member id', async () => {
    const wrapper = mountRow(
      { key: 'audio_reader', state: 'targeted' },
      { grants: [{ id: 'member-a', display_name: 'Ada Lovelace', avatar_url: null }] }
    )

    await wrapper.find('[data-testid="admin-capabilities-row__remove-button"]').trigger('click')

    expect(removeGrantMutate).toHaveBeenCalledWith({ key: 'audio_reader', member_id: 'member-a' })
  })
})

describe('CapabilityRow — granted list branches', () => {
  test('shows the loading skeleton while grants are loading', () => {
    const wrapper = mountRow({ key: 'audio_reader', state: 'targeted' }, { grants_loading: true })

    expect(wrapper.find('[data-testid="admin-capabilities-row__granted-skeleton"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="admin-capabilities-row__granted-empty"]').exists()).toBe(
      false
    )
    expect(wrapper.find('[data-testid="admin-capabilities-row__granted-list"]').exists()).toBe(
      false
    )
  })

  test('shows the empty state once loading finishes with zero grants', () => {
    const wrapper = mountRow(
      { key: 'audio_reader', state: 'targeted' },
      { grants_loading: false, grants: [] }
    )

    expect(wrapper.find('[data-testid="admin-capabilities-row__granted-skeleton"]').exists()).toBe(
      false
    )
    expect(wrapper.find('[data-testid="admin-capabilities-row__granted-empty"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="admin-capabilities-row__granted-list"]').exists()).toBe(
      false
    )
  })

  test('shows the granted rows once loading finishes with grants present', () => {
    const wrapper = mountRow(
      { key: 'audio_reader', state: 'targeted' },
      {
        grants_loading: false,
        grants: [{ id: 'member-a', display_name: 'Ada Lovelace', avatar_url: null }]
      }
    )

    expect(wrapper.find('[data-testid="admin-capabilities-row__granted-skeleton"]').exists()).toBe(
      false
    )
    expect(wrapper.find('[data-testid="admin-capabilities-row__granted-empty"]').exists()).toBe(
      false
    )
    expect(wrapper.find('[data-testid="admin-capabilities-row__granted-list"]').exists()).toBe(true)
  })
})
