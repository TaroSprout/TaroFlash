<script setup lang="ts">
import UiTooltip from '@/components/ui-kit/tooltip.vue'

const { textAlign = 'left', size = 'base' } = defineProps<{
  label?: string
  placeholder?: string
  textAlign?: 'left' | 'center' | 'right'
  size?: 'sm' | 'base' | 'lg'
  error?: string
}>()

const emit = defineEmits<{
  (e: 'input', value?: string): void
}>()

const value = defineModel<string>('value')
</script>

<template>
  <ui-tooltip
    element="label"
    data-theme="brown-100"
    data-theme-dark="stone-700"
    data-testid="ui-kit-input-container"
    class="ui-kit-input-container"
    :text="error"
    :visible="!!error"
    :suppress="!error"
    theme="red-500"
    position="top-end"
    :gap="-14"
    :class="[
      `ui-kit-input-container--text-${textAlign}`,
      `ui-kit-input-container--${size}`,
      { 'ui-kit-input-container--error': !!error }
    ]"
  >
    <span v-if="label">{{ label }}</span>
    <div data-testid="ui-kit-input" class="ui-kit-input">
      <input
        v-bind="$attrs"
        v-sfx.focus="'type_05'"
        :placeholder="placeholder"
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
  color: var(--color-brown-700);
}

.ui-kit-input {
  background-color: var(--theme-primary);
  border-radius: var(--radius-4);
  width: 100%;
  padding: 12px 16px;
  outline: 1px solid transparent;
  transition: outline-color 60ms ease-in-out;

  width: 100%;
  position: relative;
}

.ui-kit-input:focus-within {
  outline-color: var(--color-blue-500);
}

.ui-kit-input-container--error .ui-kit-input {
  outline-color: var(--color-red-500);
}

.ui-kit-input input {
  border-bottom: 1px dashed var(--theme-neutral);
  outline: none;
  background: transparent;
  color: var(--theme-on-primary);

  width: 100%;
  min-width: 0;
}
.ui-kit-input input::placeholder {
  color: var(--theme-neutral);
}
.ui-kit-input input:autofill,
.ui-kit-input input:autofill:hover,
.ui-kit-input input:autofill:focus,
.ui-kit-input input::-webkit-autofill,
.ui-kit-input input::-webkit-autofill:hover,
.ui-kit-input input::-webkit-autofill:focus {
  box-shadow: 0 0 0px 1000px var(--theme-primary) inset;
}

:where([data-theme='dark'], [data-theme='dark'] *) .ui-kit-input-container span {
  color: var(--color-brown-100);
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
