<script setup lang="ts">
import { computed } from 'vue'
import SpinboxButton from './button.vue'
import { useNumericInput } from '@/composables/ui/numeric-input'

type SpinboxProps = {
  min?: number
  max?: number
  step?: number
  label?: string
  suffix?: string
  wrap?: boolean
}

const {
  min = -Infinity,
  max = Infinity,
  step = 1,
  label,
  suffix,
  wrap = false
} = defineProps<SpinboxProps>()

const value = defineModel<number>('value', { required: true })

const can_decrement = computed(() => value.value > min || (wrap && Number.isFinite(max)))
const can_increment = computed(() => value.value < max || (wrap && Number.isFinite(min)))

const { clamp, onInput, onBeforeInput, onFocus, onBlur } = useNumericInput(value, {
  min: () => min,
  max: () => max
})

function decrement() {
  if (value.value <= min) {
    if (wrap && Number.isFinite(max)) value.value = max
    return
  }
  value.value = clamp(value.value - step)
}

function increment() {
  if (value.value >= max) {
    if (wrap && Number.isFinite(min)) value.value = min
    return
  }
  value.value = clamp(value.value + step)
}
</script>

<template>
  <div
    data-testid="ui-kit-spinbox-container"
    class="flex gap-1 w-max"
    data-theme="brown-100"
    data-theme-dark="stone-700"
  >
    <label
      v-if="label"
      data-testid="ui-kit-spinbox__label"
      class="text-brown-700 dark:text-brown-100"
    >
      {{ label }}
    </label>

    <div
      data-testid="ui-kit-spinbox"
      class="inline-flex items-center bg-(--theme-primary) rounded-4 p-1 gap-0.5"
    >
      <spinbox-button
        data-testid="ui-kit-spinbox__decrement"
        icon="horizontal-rule"
        :disabled="!can_decrement"
        @click="decrement"
      />

      <div data-testid="ui-kit-spinbox__value" class="inline-flex items-baseline justify-center">
        <input
          type="text"
          inputmode="numeric"
          data-testid="ui-kit-spinbox__input"
          class="text-center tabular-nums text-brown-700 dark:text-brown-100 bg-transparent outline-none text-base px-2 w-12"
          :value="value"
          :step="step"
          @beforeinput="onBeforeInput"
          @focus="onFocus"
          @input="onInput"
          @blur="onBlur"
        />
        <span
          v-if="suffix"
          data-testid="ui-kit-spinbox__suffix"
          class="ml-0.5 text-brown-500 dark:text-brown-300"
        >
          {{ suffix }}
        </span>
      </div>

      <spinbox-button
        data-testid="ui-kit-spinbox__increment"
        icon="add"
        :disabled="!can_increment"
        @click="increment"
      />
    </div>
  </div>
</template>
