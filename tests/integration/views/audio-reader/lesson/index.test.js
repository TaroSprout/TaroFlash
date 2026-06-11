import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const {
  lessonRef,
  paragraphsRef,
  audioUrlRef,
  activeWordRef,
  selectionRef,
  popoverOpenRef,
  targetLang,
  openTermMock,
  closeTermMock,
  chaptersRef,
  progressMutate,
  editModalOpenMock,
  routerPushMock
} = vi.hoisted(() => ({
  lessonRef: { value: { id: 2, title: 'Hiragana Basics' } },
  paragraphsRef: { value: [] },
  audioUrlRef: { value: null },
  activeWordRef: { value: null },
  selectionRef: { value: null },
  popoverOpenRef: { value: false },
  targetLang: 'English',
  openTermMock: vi.fn(),
  closeTermMock: vi.fn(),
  chaptersRef: { value: [] },
  progressMutate: vi.fn(),
  editModalOpenMock: vi.fn(),
  routerPushMock: vi.fn()
}))

vi.mock('@/composables/audio-reader/use-lesson-reader', () => ({
  useLessonReader: () => ({
    lesson: lessonRef,
    paragraphs: paragraphsRef,
    audio_url: audioUrlRef,
    active_word: activeWordRef,
    selection: selectionRef,
    popover_open: popoverOpenRef,
    target_lang: targetLang,
    openTerm: openTermMock,
    closeTerm: closeTermMock
  })
}))

vi.mock('@/api/lessons', () => ({
  useLessonsByCollectionQuery: () => ({ data: chaptersRef }),
  useSetCollectionProgressMutation: () => ({ mutate: progressMutate }),
  useLessonCollectionsQuery: () => ({ data: { value: [] } }),
  useLessonCollectionQuery: () => ({ data: { value: null } }),
  useLessonQuery: () => ({ data: { value: null }, error: { value: null } }),
  useLessonAudioUrlQuery: () => ({ data: { value: null } }),
  useStartLessonMutation: () => ({ mutateAsync: vi.fn() }),
  useDeleteLessonMutation: () => ({ mutateAsync: vi.fn() }),
  useRetryLessonMutation: () => ({ mutateAsync: vi.fn() }),
  useCreateLessonCollectionMutation: () => ({ mutateAsync: vi.fn() }),
  useDeleteLessonCollectionMutation: () => ({ mutateAsync: vi.fn() }),
  useTranslateTermMutation: () => ({ mutateAsync: vi.fn() }),
  resolveCollectionEntryLesson: vi.fn(),
  EdgeFunctionError: class EdgeFunctionError extends Error {}
}))

vi.mock('@/composables/modals/use-collection-edit-modal', () => ({
  useCollectionEditModal: () => ({ open: editModalOpenMock })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPushMock })
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const TranscriptViewStub = defineComponent({
  name: 'TranscriptView',
  props: ['paragraphs', 'active_word', 'popover_open'],
  emits: ['select'],
  setup() {
    return () => h('div', { 'data-testid': 'transcript-view-stub' })
  }
})

const TermPopoverStub = defineComponent({
  name: 'TermPopover',
  props: ['open', 'rect', 'term', 'sentence', 'target_lang'],
  emits: ['close'],
  setup() {
    return () => h('div', { 'data-testid': 'term-popover-stub' })
  }
})

// ── Component import (after mocks) ────────────────────────────────────────────

import LessonView from '@/views/audio-reader/lesson/index.vue'
import AudioToolbar from '@/views/audio-reader/lesson/audio-toolbar.vue'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CHAPTERS = [
  { id: 1, title: 'Chapter One' },
  { id: 2, title: 'Chapter Two' },
  { id: 3, title: 'Chapter Three' }
]

const COLLECTION_ID = '5'
const LESSON_ID = '2'

function mountView(props = {}) {
  return shallowMount(LessonView, {
    props: { collectionId: COLLECTION_ID, lessonId: LESSON_ID, ...props },
    global: {
      stubs: { TranscriptView: TranscriptViewStub, TermPopover: TermPopoverStub }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  lessonRef.value = { id: 2, title: 'Hiragana Basics' }
  chaptersRef.value = []
  progressMutate.mockClear()
  editModalOpenMock.mockClear()
  routerPushMock.mockClear()
})

describe('LessonView', () => {
  describe('progress bookmark', () => {
    test('calls progress mutate with collection_id and lesson_id on mount when lesson is loaded', async () => {
      lessonRef.value = { id: 2, title: 'Hiragana Basics' }
      mountView()
      await flushPromises()

      expect(progressMutate).toHaveBeenCalledOnce()
      expect(progressMutate).toHaveBeenCalledWith({ collection_id: 5, lesson_id: 2 })
    })

    test('does not call mutate when lesson is null on mount', async () => {
      lessonRef.value = null
      mountView()
      await flushPromises()

      expect(progressMutate).not.toHaveBeenCalled()
    })
  })

  describe('chapter navigation via toolbar', () => {
    test('the audio toolbar select-chapter event navigates to that chapter', async () => {
      chaptersRef.value = CHAPTERS
      const wrapper = mountView({ lessonId: '2' })

      wrapper.findComponent(AudioToolbar).vm.$emit('select-chapter', 1)
      await flushPromises()

      expect(routerPushMock).toHaveBeenCalledWith({
        name: 'lesson',
        params: { collectionId: 5, lessonId: 1 }
      })
    })
  })

  describe('chapter list', () => {
    test('current chapter button has data-active="true"', () => {
      chaptersRef.value = CHAPTERS
      const wrapper = mountView({ lessonId: '2' })

      const buttons = wrapper.findAll('[data-testid="lesson-view__chapter"]')
      const active = buttons.filter((b) => b.attributes('data-active') === 'true')

      expect(active).toHaveLength(1)
      // chapter id 2 is at index 1
      expect(buttons[1].attributes('data-active')).toBe('true')
    })

    test('clicking a chapter button calls push with lesson name and params', async () => {
      chaptersRef.value = CHAPTERS
      const wrapper = mountView({ lessonId: '2' })

      const buttons = wrapper.findAll('[data-testid="lesson-view__chapter"]')
      await buttons[0].trigger('click')

      expect(routerPushMock).toHaveBeenCalledWith({
        name: 'lesson',
        params: { collectionId: 5, lessonId: 1 }
      })
    })
  })

  describe('chapter-of display', () => {
    test('renders chapter-of text when chapters are present', () => {
      chaptersRef.value = CHAPTERS
      const wrapper = mountView({ lessonId: '2' })

      expect(wrapper.find('[data-testid="lesson-view__chapter-of"]').exists()).toBe(true)
    })

    test('does not render chapter-of when there are no chapters', () => {
      chaptersRef.value = []
      const wrapper = mountView()

      expect(wrapper.find('[data-testid="lesson-view__chapter-of"]').exists()).toBe(false)
    })
  })

  describe('mobile title', () => {
    test('renders a centered lesson-title heading above the transcript', () => {
      const wrapper = mountView()
      expect(wrapper.find('[data-testid="lesson-view__title-text"]').exists()).toBe(true)
    })
  })

  describe('edit button', () => {
    test('clicking lesson-view__edit opens the collection edit modal', async () => {
      const wrapper = mountView()
      await wrapper.find('[data-testid="lesson-view__edit"]').trigger('click')

      expect(editModalOpenMock).toHaveBeenCalledOnce()
      expect(editModalOpenMock).toHaveBeenCalledWith(5)
    })
  })
})
