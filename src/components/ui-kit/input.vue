<script setup lang="ts">
import UiTooltip from '@/components/ui-kit/tooltip.vue'

type UiInputProps = {
  label?: string
  placeholder?: string
  textAlign?: 'left' | 'center' | 'right'
  size?: 'sm' | 'base' | 'lg'
  error?: string
  maxLength?: number
}

const { textAlign = 'left', size = 'lg', maxLength } = defineProps<UiInputProps>()

const emit = defineEmits<{
  (e: 'input', value?: string): void
}>()

const value = defineModel<string>('value')
</script>

<template>
  <ui-tooltip
    element="label"
    data-testid="ui-kit-input-container"
    class="ui-kit-input-container"
    :text="error"
    :visible="!!error"
    :suppress="!error"
    theme="red-500"
    theme_dark="red-600"
    position="top-end"
    :gap="-14"
    :class="[
      `ui-kit-input-container--text-${textAlign}`,
      `ui-kit-input-container--${size}`,
      { 'ui-kit-input-container--error': !!error }
    ]"
  >
    <span v-if="label">{{ label }}</span>
    <div data-testid="ui-kit-input" class="ui-kit-input" :data-palette="error ? 'danger' : 'info'">
      <input
        v-bind="$attrs"
        v-sfx.focus="'type_05'"
        :placeholder="placeholder"
        :maxlength="maxLength"
        v-model="value"
        @input="emit('input', value)"
      />
    </div>
  </ui-tooltip>
</template>

<style>
.ui-kit-input-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.ui-kit-input-container--sm .ui-kit-input {
  border-radius: var(--radius-3_5);
  font-size: var(--text-sm);
  line-height: var(--text-sm--line-height);
  padding: 8px 12px;
}

.ui-kit-input-container--lg .ui-kit-input {
  border-radius: var(--radius-5_5);
  font-size: var(--text-lg);
  line-height: var(--text-lg--line-height);
  padding: 16px 24px;
}

.ui-kit-input-container span {
  color: var(--color-ink);
}

/* The field is a WELL — one step below whatever surface it sits on. It used to
   fake `data-theme="brown-100"` to get a neutral fill, which overwrote the real
   identity for everything inside it. */
.ui-kit-input {
  background-color: var(--color-below);
  border-radius: var(--radius-4);
  width: 100%;
  padding: 12px 16px;
  outline: 1px solid transparent;
  transition: outline-color 60ms ease-in-out;

  width: 100%;
  position: relative;
}

/* Both rings read --color-accent; the element carries data-palette="info"
   normally and "danger" while errored, so the meaning lives in the markup and
   the colour comes from the identity registry. */
.ui-kit-input:focus-within,
.ui-kit-input-container--error .ui-kit-input {
  outline-color: var(--color-accent);
}

.ui-kit-input input {
  border-bottom: 1px dashed var(--color-ink);
  outline: none;
  background: transparent;
  color: var(--color-ink);

  width: 100%;
  min-width: 0;
}
/* The underline is state-driven ink: it recedes while the field is empty. */
.ui-kit-input input:placeholder-shown {
  border-bottom-color: var(--color-ink-muted);
}
.ui-kit-input input::placeholder {
  color: var(--color-ink-muted);
}
.ui-kit-input input:disabled {
  color: var(--color-ink-muted);
}
.ui-kit-input input:autofill,
.ui-kit-input input:autofill:hover,
.ui-kit-input input:autofill:focus,
.ui-kit-input input::-webkit-autofill,
.ui-kit-input input::-webkit-autofill:hover,
.ui-kit-input input::-webkit-autofill:focus {
  box-shadow: 0 0 0px 1000px var(--color-below) inset;
}

.ui-kit-input-container--text-left input {
  text-align: left;
}

.ui-kit-input-container--text-right input {
  text-align: right;
}

.ui-kit-input-container--text-center input {
  text-align: center;
}
</style>
