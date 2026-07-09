<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import { computed, inject, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { debounce } from '@/utils/debounce'
import { emitSfx } from '@/sfx/bus'
import { cardSearchKey } from '@/views/deck/composables'
import { expandSearchInput, collapseSearchInput } from '@/utils/animations/deck-view/search-field'
import { usePinScrollWhileTyping } from '@/composables/ui/pin-scroll-while-typing'

type SearchBarProps = {
  size?: 'sm' | 'base' | 'lg' | 'xl'
  // Resting button variant; the field always switches to ghost once expanded.
  variant?: 'solid' | 'outline' | 'ghost'
  // Target width of the revealed input, in px (ignored when `fill`).
  expandedWidth?: number
  // Expand to fill the remaining row width instead of a fixed width (footer).
  fill?: boolean
}

const {
  size = 'base',
  variant = 'solid',
  expandedWidth = 208,
  fill = false
} = defineProps<SearchBarProps>()

const { t } = useI18n()

const { is_searching, is_loading, query, open, close } = inject(cardSearchKey)!

const container = useTemplateRef<HTMLElement>('container')
const input = useTemplateRef<HTMLInputElement>('input')

usePinScrollWhileTyping(container)

const draft = ref('')

const has_text = computed(() => draft.value.trim().length > 0)

const button_label = computed(() => {
  if (!is_searching.value) return t('deck-view.search-bar.open')
  return t(has_text.value ? 'deck-view.search-bar.clear' : 'deck-view.search-bar.close')
})

function onButton() {
  if (!is_searching.value) open()
  else if (has_text.value) clear()
  else onClose()
}

// Live as you type, debounced so each keystroke doesn't refetch.
function onInput() {
  debounce(submit, { key: 'deck-card-search', delay: 250 })
}

// Commit the current draft immediately — Enter skips the debounce.
function submit() {
  query.value = draft.value.trim()
}

// Empty the field but stay in search mode, dropping back to the full list.
function clear() {
  emitSfx('snappy_button_5')
  draft.value = ''
  query.value = ''
  input.value?.focus()
}

function onClose() {
  draft.value = ''
  close()
}

// Clicking away from an empty field dismisses it; a field with text stays open
// so its filtered results persist.
function onFocusOut(e: FocusEvent) {
  if (container.value?.contains(e.relatedTarget as Node | null)) return
  if (draft.value.trim()) return
  onClose()
}

// Fill mode: the field should span the rest of the row, so its target width is
// the row's content width minus the button already sitting in it.
function fillTarget(): number {
  const row = container.value?.parentElement
  const button = container.value?.querySelector<HTMLElement>(
    '[data-testid="deck-search-bar__button"]'
  )
  if (!row || !button) return expandedWidth

  const { paddingLeft, paddingRight } = getComputedStyle(row)
  const content = row.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight)
  return Math.max(0, content - button.offsetWidth)
}

function onEnter(el: Element, done: () => void) {
  expandSearchInput(el as HTMLElement, fill ? fillTarget() : expandedWidth, done)
  el.querySelector('input')?.focus()
}

function onLeave(el: Element, done: () => void) {
  collapseSearchInput(el as HTMLElement, done)
}
</script>

<template>
  <div
    data-theme="brown-100"
    data-theme-dark="stone-700"
    ref="container"
    data-testid="deck-search-bar"
    :data-expanded="is_searching"
    class="search-bar"
    :class="`ui-kit-btn-tokens--${size}`"
    @focusout="onFocusOut"
  >
    <Transition :css="false" @enter="onEnter" @leave="onLeave">
      <div v-if="is_searching" data-testid="deck-search-bar__field" class="search-bar__field">
        <input
          ref="input"
          v-model="draft"
          type="text"
          size="1"
          data-testid="deck-search-bar__input"
          class="search-bar__input"
          :placeholder="t('deck-view.search-bar.placeholder')"
          @input="onInput"
          @keydown.enter="submit"
          @keydown.esc="onClose"
        />
      </div>
    </Transition>

    <ui-button
      data-testid="deck-search-bar__button"
      :size="size"
      :variant="is_searching ? 'ghost' : variant"
      :loading="is_loading"
      :icon-left="is_searching ? 'close' : 'search'"
      :play-on-tap="false"
      icon-only
      @press="onButton"
    >
      {{ button_label }}
    </ui-button>
  </div>
</template>

<style>
.search-bar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  width: max-content;
  border-radius: var(--btn-border-radius);
  height: var(--btn-height);
}

.search-bar[data-expanded='true'] {
  background-color: var(--theme-primary);
  outline: 2px solid var(--theme-primary);
  transition: outline-color 60ms ease-in-out;
}

.search-bar[data-expanded='true']:focus-within {
  outline-color: var(--color-blue-500);
}

.search-bar__field {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
}

.search-bar__input {
  width: 100%;
  min-width: 0;
  padding-left: 12px;
  background: transparent;
  outline: none;
  color: var(--theme-on-primary);
  font-size: var(--btn-font-size);
  line-height: var(--btn-font-size--line-height);
}

.search-bar__input::placeholder {
  color: var(--theme-neutral);
}
</style>
