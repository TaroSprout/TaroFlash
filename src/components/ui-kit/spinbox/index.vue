<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
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

const focused = ref(false)

const can_decrement = computed(() => value.value > min || (wrap && Number.isFinite(max)))
const can_increment = computed(() => value.value < max || (wrap && Number.isFinite(min)))

// The suffix is rendered as part of the value string ("10d") so it reads as one
// centered token in the fixed-width field. While focused we drop it back to the
// bare number so the numeric parser + caret only ever see digits.
const display_value = computed(() =>
  suffix && !focused.value ? `${value.value}${suffix}` : value.value
)

const {
  clamp,
  onInput,
  onBeforeInput,
  onBlur: normalizeInput
} = useNumericInput(value, {
  min: () => min,
  max: () => max
})

function onFocus(e: FocusEvent) {
  focused.value = true
  const el = e.target as HTMLInputElement
  void nextTick(() => el.select())
}

function onBlur(e: Event) {
  normalizeInput(e)
  focused.value = false
}

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
        icon="subtract"
        :disabled="!can_decrement"
        @click="decrement"
      />

      <div data-testid="ui-kit-spinbox__value" class="inline-flex items-baseline justify-center">
        <input
          type="text"
          inputmode="numeric"
          data-testid="ui-kit-spinbox__input"
          class="text-center tabular-nums text-brown-700 dark:text-brown-100 bg-transparent outline-none text-base px-2 w-12"
          :value="display_value"
          :step="step"
          @beforeinput="onBeforeInput"
          @focus="onFocus"
          @input="onInput"
          @blur="onBlur"
        />
      </div>

      <spinbox-button
        data-testid="ui-kit-spinbox__increment"
        icon="add-2"
        :disabled="!can_increment"
        @click="increment"
      />
    </div>
  </div>
</template>
