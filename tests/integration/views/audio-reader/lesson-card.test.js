import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import LessonCard from '@/views/audio-reader/lesson-card.vue'

// ── Stubs ──────────────────────────────────────────────────────────────────────

const UiButtonStub = defineComponent({
  name: 'UiButton',
  emits: ['click'],
  setup(_, { emit, slots, attrs }) {
    return () =>
      h('button', { ...attrs, onClick: () => emit('click') }, slots.default ? slots.default() : [])
  }
})

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup(props, { attrs }) {
    return () => h('span', { ...attrs, 'data-testid': 'ui-icon', 'data-src': props.src })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = {
  id: 1,
  collection_id: 2,
  title: 'Lesson One',
  audio_path: 'm/u.m4a',
  transcript: { text: '', segments: [] },
  created_at: '2026-06-01T00:00:00Z'
}

const ready = { ...BASE, status: 'ready' }
const processing = { ...BASE, status: 'processing', phase: 'transcribing' }
const failed = { ...BASE, status: 'failed', error_code: 'timeout' }

function mountCard(lesson) {
  return shallowMount(LessonCard, {
    props: { lesson },
    global: { stubs: { UiButton: UiButtonStub, UiIcon: UiIconStub } }
  })
}

const open = (w) => w.find('[data-testid="lesson-card__open"]')
const icon = (w) => w.find('[data-testid="lesson-card__icon"] [data-testid="ui-icon"]')

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LessonCard', () => {
  test('exposes the status on the root via data-status', () => {
    expect(
      mountCard(processing).find('[data-testid="lesson-card"]').attributes('data-status')
    ).toBe('processing')
  })

  describe('ready', () => {
    test('shows the date and a music-note icon, and the open button is enabled', () => {
      const w = mountCard(ready)
      expect(w.find('[data-testid="lesson-card__date"]').exists()).toBe(true)
      expect(w.find('[data-testid="lesson-card__status"]').exists()).toBe(false)
      expect(w.find('[data-testid="lesson-card__retry"]').exists()).toBe(false)
      expect(open(w).attributes('disabled')).toBeUndefined()
      expect(icon(w).attributes('data-src')).toBe('music-note')
    })

    test('emits open when the card is clicked', async () => {
      const w = mountCard(ready)
      await open(w).trigger('click')
      expect(w.emitted('open')).toHaveLength(1)
    })
  })

  describe('processing', () => {
    test('shows a status line + loading icon and disables opening', () => {
      const w = mountCard(processing)
      expect(w.find('[data-testid="lesson-card__status"]').exists()).toBe(true)
      expect(w.find('[data-testid="lesson-card__date"]').exists()).toBe(false)
      expect(w.find('[data-testid="lesson-card__retry"]').exists()).toBe(false)
      expect(open(w).attributes('disabled')).toBeDefined()
      expect(icon(w).attributes('data-src')).toBe('loading-dots')
    })
  })

  describe('failed', () => {
    test('shows a status line, an error icon, and a retry button', () => {
      const w = mountCard(failed)
      expect(w.find('[data-testid="lesson-card__status"]').exists()).toBe(true)
      expect(w.find('[data-testid="lesson-card__retry"]').exists()).toBe(true)
      expect(open(w).attributes('disabled')).toBeDefined()
      expect(icon(w).attributes('data-src')).toBe('close')
    })

    test('emits retry when the retry button is clicked', async () => {
      const w = mountCard(failed)
      await w.find('[data-testid="lesson-card__retry"]').trigger('click')
      expect(w.emitted('retry')).toHaveLength(1)
    })
  })

  test('emits delete when the delete button is clicked', async () => {
    const w = mountCard(ready)
    await w.find('[data-testid="lesson-card__delete"]').trigger('click')
    expect(w.emitted('delete')).toHaveLength(1)
  })
})
