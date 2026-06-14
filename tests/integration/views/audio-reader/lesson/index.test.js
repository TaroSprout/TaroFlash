import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────
// Plain-object refs suffice for state the script reads via .value (watch, onMounted).
// For values that Vue's template auto-unwraps (selection, popover_open)
// we need real Vue refs — created at module level after imports so the template
// reactive system sees them as refs and auto-unwraps them correctly.

const {
  lessonRef,
  paragraphsRef,
  audioUrlRef,
  activeWordRef,
  targetLang,
  openTermMock,
  closeTermMock,
  playFromHereMock,
  playClipMock,
  playerRef,
  chaptersRef,
  progressMutate,
  useReaderProgressMock,
  editModalOpenMock,
  routerPushMock,
  emitSfxMock
} = vi.hoisted(() => ({
  lessonRef: { value: { id: 2, title: 'Hiragana Basics' } },
  paragraphsRef: { value: [] },
  audioUrlRef: { value: null },
  activeWordRef: { value: null },
  targetLang: 'English',
  openTermMock: vi.fn(),
  closeTermMock: vi.fn(),
  playFromHereMock: vi.fn(),
  playClipMock: vi.fn(),
  playerRef: { is_playing: { value: false } },
  chaptersRef: { value: [] },
  progressMutate: vi.fn(),
  useReaderProgressMock: vi.fn(() => ({ restored: { value: true } })),
  editModalOpenMock: vi.fn(),
  routerPushMock: vi.fn(),
  emitSfxMock: vi.fn()
}))

// Real Vue refs for template-reactive state. Created here (after imports) so
// `ref()` is available. The vi.mock factories below close over these variables.
const selectionRef = ref(null)
const popoverOpenRef = ref(false)

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
    closeTerm: closeTermMock,
    playFromHere: playFromHereMock,
    playClip: playClipMock,
    player: playerRef
  })
}))

vi.mock('@/composables/audio-reader/use-reader-progress', () => ({
  useReaderProgress: useReaderProgressMock
}))

vi.mock('@/composables/use-animated-height', () => ({
  useAnimatedHeight: vi.fn()
}))

vi.mock('@/utils/animations/footer-swap', () => ({
  footerSwapBeforeLeave: vi.fn(() => vi.fn()),
  footerSwapEnter: vi.fn(() => vi.fn((_el, done) => done?.())),
  footerSwapLeave: vi.fn((_el, done) => done?.())
}))

vi.mock('@/utils/animations/transcript-scroll', () => ({
  scrollClearOf: vi.fn(),
  scrollLineIntoView: vi.fn(),
  scrollWordIntoDeadzone: vi.fn()
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

vi.mock('@/sfx/bus', () => ({
  emitSfx: emitSfxMock,
  emitHoverSfx: vi.fn()
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const TranscriptViewStub = defineComponent({
  name: 'TranscriptView',
  props: ['paragraphs', 'active_word', 'popover_open'],
  emits: ['select', 'dismiss'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'transcript-view-stub' }, [
        h('button', {
          'data-testid': 'transcript-stub__dismiss',
          onClick: () => emit('dismiss')
        })
      ])
  }
})

const TermCardStub = defineComponent({
  name: 'TermCard',
  props: ['term', 'sentence', 'target_lang', 'show_back'],
  emits: ['back', 'close', 'play-from-here', 'play-word'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'term-card-stub' }, [
        h('button', { 'data-testid': 'term-card-stub__back', onClick: () => emit('back') }),
        h('button', { 'data-testid': 'term-card-stub__close', onClick: () => emit('close') }),
        h('button', {
          'data-testid': 'term-card-stub__play-from-here',
          onClick: () => emit('play-from-here')
        }),
        h('button', {
          'data-testid': 'term-card-stub__play-word',
          onClick: () => emit('play-word')
        })
      ])
  }
})

// ── Component import (after mocks) ────────────────────────────────────────────

import LessonView from '@/views/audio-reader/lesson/index.vue'
import AudioToolbar from '@/views/audio-reader/lesson/audio-toolbar.vue'
import { footerSwapBeforeLeave, footerSwapEnter } from '@/utils/animations/footer-swap'
import { useAnimatedHeight } from '@/composables/use-animated-height'

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
      stubs: {
        TranscriptView: TranscriptViewStub,
        TermCard: TermCardStub
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  lessonRef.value = { id: 2, title: 'Hiragana Basics' }
  chaptersRef.value = []
  selectionRef.value = null
  popoverOpenRef.value = false
  progressMutate.mockClear()
  editModalOpenMock.mockClear()
  routerPushMock.mockClear()
  useReaderProgressMock.mockClear()
  openTermMock.mockClear()
  closeTermMock.mockClear()
  playFromHereMock.mockClear()
  playClipMock.mockClear()
  emitSfxMock.mockClear()
})

describe('LessonView', () => {
  describe('progress tracking', () => {
    test('hands the collection id, lesson id, and player to useReaderProgress', async () => {
      mountView()
      await flushPromises()

      expect(useReaderProgressMock).toHaveBeenCalledOnce()
      const [collectionArg, lessonArg, playerArg] = useReaderProgressMock.mock.calls[0]
      expect(collectionArg.value).toBe(5)
      expect(lessonArg.value).toBe(2)
      expect(playerArg).toBe(playerRef)
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

  describe('footer — show_term_in_footer [obligation]', () => {
    test('footer shows toolbar by default (no selection, popover closed)', () => {
      const wrapper = mountView()

      expect(wrapper.find('[data-testid="lesson-view__footer-toolbar"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="lesson-view__footer-term"]').exists()).toBe(false)
    })

    // [obligation] show_term_in_footer no longer requires mobile: computed is
    // `popover_open && !!selection` — on a desktop-width viewport the footer term
    // card should show when a term is committed.
    test('footer shows term-card on desktop when popover open and selection set [obligation]', async () => {
      popoverOpenRef.value = true
      selectionRef.value = { term: 'hello', sentence: 'say hello', word_index: 3, rect: {} }

      const wrapper = mountView()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="lesson-view__footer-term"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="lesson-view__footer-toolbar"]').exists()).toBe(false)
    })

    test('footer shows toolbar when popover is closed even with selection [obligation]', async () => {
      popoverOpenRef.value = false
      selectionRef.value = { term: 'hello', sentence: 'say hello', word_index: 3, rect: {} }

      const wrapper = mountView()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="lesson-view__footer-toolbar"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="lesson-view__footer-term"]').exists()).toBe(false)
    })

    test('footer shows toolbar when popover open but no selection [obligation]', async () => {
      popoverOpenRef.value = true
      selectionRef.value = null

      const wrapper = mountView()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="lesson-view__footer-toolbar"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="lesson-view__footer-term"]').exists()).toBe(false)
    })

    test('term-card in footer receives the selection term and sentence [obligation]', async () => {
      popoverOpenRef.value = true
      selectionRef.value = {
        term: 'konnichiwa',
        sentence: 'konnichiwa world',
        word_index: 0,
        rect: {}
      }

      const wrapper = mountView()
      await wrapper.vm.$nextTick()

      const termCard = wrapper.findComponent({ name: 'TermCard' })
      expect(termCard.exists()).toBe(true)
      expect(termCard.props('term')).toBe('konnichiwa')
      expect(termCard.props('sentence')).toBe('konnichiwa world')
    })

    test('term-card back event calls closeTerm [obligation]', async () => {
      popoverOpenRef.value = true
      selectionRef.value = { term: 'hi', sentence: 'say hi', word_index: 1, rect: {} }

      const wrapper = mountView()
      await wrapper.vm.$nextTick()

      await wrapper.find('[data-testid="term-card-stub__back"]').trigger('click')
      expect(closeTermMock).toHaveBeenCalledOnce()
    })

    test('term-card close event calls closeTerm [obligation]', async () => {
      popoverOpenRef.value = true
      selectionRef.value = { term: 'hi', sentence: 'say hi', word_index: 1, rect: {} }

      const wrapper = mountView()
      await wrapper.vm.$nextTick()

      await wrapper.find('[data-testid="term-card-stub__close"]').trigger('click')
      expect(closeTermMock).toHaveBeenCalledOnce()
    })

    test('term-card play-from-here event calls playFromHere [obligation]', async () => {
      popoverOpenRef.value = true
      selectionRef.value = { term: 'hi', sentence: 'say hi', word_index: 1, rect: {} }

      const wrapper = mountView()
      await wrapper.vm.$nextTick()

      await wrapper.find('[data-testid="term-card-stub__play-from-here"]').trigger('click')
      expect(playFromHereMock).toHaveBeenCalledOnce()
    })

    test('term-card play-word event calls playClip [obligation]', async () => {
      popoverOpenRef.value = true
      selectionRef.value = { term: 'hi', sentence: 'say hi', word_index: 1, rect: {} }

      const wrapper = mountView()
      await wrapper.vm.$nextTick()

      await wrapper.find('[data-testid="term-card-stub__play-word"]').trigger('click')
      expect(playClipMock).toHaveBeenCalledOnce()
    })
  })

  describe('dismissTerm — transcript dismiss event [obligation]', () => {
    test('transcript dismiss event calls closeTerm [obligation]', async () => {
      popoverOpenRef.value = true
      selectionRef.value = { term: 'hi', sentence: 'say hi', word_index: 1, rect: {} }

      const wrapper = mountView()
      await wrapper.vm.$nextTick()

      await wrapper.find('[data-testid="transcript-stub__dismiss"]').trigger('click')

      expect(closeTermMock).toHaveBeenCalledOnce()
    })

    test('transcript dismiss event emits ui.snappy_button_5 [obligation]', async () => {
      popoverOpenRef.value = true
      selectionRef.value = { term: 'hi', sentence: 'say hi', word_index: 1, rect: {} }

      const wrapper = mountView()
      await wrapper.vm.$nextTick()

      await wrapper.find('[data-testid="transcript-stub__dismiss"]').trigger('click')

      expect(emitSfxMock).toHaveBeenCalledWith('ui.snappy_button_5')
    })

    test('closeTerm alone does NOT emit ui.snappy_button_5 [obligation]', async () => {
      popoverOpenRef.value = true
      selectionRef.value = { term: 'hi', sentence: 'say hi', word_index: 1, rect: {} }

      const wrapper = mountView()
      await wrapper.vm.$nextTick()

      // Trigger close via term-card's close event (not dismiss)
      await wrapper.find('[data-testid="term-card-stub__close"]').trigger('click')

      // closeTermMock was called but sfx was NOT emitted (sfx only in dismissTerm)
      expect(closeTermMock).toHaveBeenCalledOnce()
      expect(emitSfxMock).not.toHaveBeenCalledWith('ui.snappy_button_5')
    })
  })

  describe('footer layout', () => {
    test('useAnimatedHeight is wired during setup', () => {
      vi.clearAllMocks()
      mountView()

      // Wired once for footer_term and once for footer_toolbar
      expect(useAnimatedHeight).toHaveBeenCalledTimes(2)
    })
  })
})
