import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRouterPush, mockResolveEntry, mockEditModalOpen, mockNotice } = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
  mockResolveEntry: vi.fn(),
  mockEditModalOpen: vi.fn(),
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

vi.mock('@/api/lessons', () => ({
  resolveCollectionEntryLesson: mockResolveEntry
}))

vi.mock('@/composables/audio-reader/collection-edit-modal', () => ({
  useCollectionEditModal: () => ({ open: mockEditModalOpen })
}))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => mockNotice
}))

import { useOpenCollection } from '@/composables/audio-reader/open-collection'

beforeEach(() => {
  mockRouterPush.mockReset()
  mockResolveEntry.mockReset()
  mockEditModalOpen.mockReset()
  mockNotice.error.mockReset()
})

const collection = { id: 5 }

describe('useOpenCollection', () => {
  test('navigates to the resolved lesson when one exists', async () => {
    mockResolveEntry.mockResolvedValueOnce(42)
    const { openCollection } = useOpenCollection()

    await openCollection(collection)

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: 'lesson',
      params: { collectionId: 5, lessonId: 42 }
    })
  })

  test('opens the edit modal instead of navigating when no lesson id resolves (empty collection)', async () => {
    mockResolveEntry.mockResolvedValueOnce(null)
    const { openCollection } = useOpenCollection()

    await openCollection(collection)

    expect(mockEditModalOpen).toHaveBeenCalledWith(5)
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  test('[obligation] shows an error notice and does NOT open the edit modal or navigate when resolveCollectionEntryLesson throws', async () => {
    mockResolveEntry.mockRejectedValueOnce(new Error('network error'))
    const { openCollection } = useOpenCollection()

    await openCollection(collection)

    expect(mockNotice.error).toHaveBeenCalledWith('lesson-collections.open-error')
    expect(mockEditModalOpen).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
  })
})
