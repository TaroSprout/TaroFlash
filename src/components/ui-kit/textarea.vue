<script setup lang="ts">
import { computed } from 'vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'

type UiTextareaProps = {
  label?: string
  placeholder?: string
  textAlign?: 'left' | 'center' | 'right'
  error?: string
  max_chars?: number
  noNewlines?: boolean
}

const { textAlign = 'left', max_chars, noNewlines = false } = defineProps<UiTextareaProps>()

const emit = defineEmits<{
  (e: 'input', value?: string): void
}>()

const value = defineModel<string>('value')

const char_count = computed(() => value.value?.length ?? 0)
const at_limit = computed(() => max_chars !== undefined && char_count.value >= max_chars)

function onKeydown(e: KeyboardEvent) {
  if (noNewlines && e.key === 'Enter') e.preventDefault()
}

function onInput() {
  if (noNewlines && value.value?.includes('\n')) {
    value.value = value.value.replace(/[\r\n]+/g, ' ')
  }
  emit('input', value.value)
}
</script>

<template>
  <ui-tooltip
    element="label"
    data-theme="brown-100"
    data-theme-dark="stone-700"
    data-testid="ui-kit-textarea-container"
    class="ui-kit-textarea-container"
    :text="error"
    :visible="!!error"
    :suppress="!error"
    theme="red-500"
    position="top-end"
    :gap="-14"
    :class="[
      `ui-kit-textarea-container--text-${textAlign}`,
      { 'ui-kit-textarea-container--error': !!error }
    ]"
  >
    <span v-if="label">{{ label }}</span>
    <div data-testid="ui-kit-textarea" class="ui-kit-textarea">
      <textarea
        v-bind="$attrs"
        v-sfx.focus="'type_05'"
        :placeholder="placeholder"
        :maxlength="max_chars"
        v-model="value"
        @keydown="onKeydown"
        @input="onInput"
      />
      <span
        v-if="max_chars !== undefined"
        data-testid="ui-kit-textarea-char-count"
        class="ui-kit-textarea-char-count"
        :class="{ 'ui-kit-textarea-char-count--limit': at_limit }"
      >
        {{ char_count }}/{{ max_chars }}
      </span>
    </div>
  </ui-tooltip>
</template>

<style>
.ui-kit-textarea-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.ui-kit-textarea-container span {
  color: var(--color-brown-700);
}

.ui-kit-textarea {
  background-color: var(--theme-primary);
  border-radius: var(--radius-4);
  width: 100%;
  padding: 12px 16px;
  outline: 1px solid transparent;
  transition: outline-color 60ms ease-in-out;
  position: relative;
}

.ui-kit-textarea:focus-within {
  outline-color: var(--color-blue-500);
}

.ui-kit-textarea-container--error .ui-kit-textarea {
  outline-color: var(--color-red-500);
}

.ui-kit-textarea textarea {
  outline: none;
  background: transparent;
  color: var(--theme-on-primary);
  font-size: var(--text-lg);
  line-height: var(--text-lg--line-height);
  width: 100%;
  min-width: 0;
  resize: none;
  scrollbar-width: none;
}

.ui-kit-textarea textarea::-webkit-scrollbar {
  display: none;
}

.ui-kit-textarea textarea::placeholder {
  color: var(--color-brown-500);
}

.ui-kit-textarea-char-count {
  display: block;
  text-align: right;
  font-size: var(--text-xs);
  line-height: var(--text-xs--line-height);
  color: var(--color-brown-500) !important;
  margin-top: 4px;
}

:where([data-theme='dark'], [data-theme='dark'] *) .ui-kit-textarea-container span {
  color: var(--color-brown-100);
}
:where([data-theme='dark'], [data-theme='dark'] *) .ui-kit-textarea-char-count {
  color: var(--color-brown-500);
}

.ui-kit-textarea-char-count--limit {
  color: var(--color-red-500);
}

.ui-kit-textarea-container--text-left textarea {
  text-align: left;
}

.ui-kit-textarea-container--text-right textarea {
  text-align: right;
}

.ui-kit-textarea-container--text-center textarea {
  text-align: center;
}
</style>
