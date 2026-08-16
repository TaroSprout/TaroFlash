<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import SpinboxButton from './button.vue'
import { useNumericInput } from '@/composables/ui/numeric-input'
import { emitSfx } from '@/sfx/bus'

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

/** Keeps a held arrow key from machine-gunning the step sound on every repeat. */
const ARROW_SFX_DEBOUNCE_MS = 40

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

// A model value outside [min, max] — a stored value that predates a tightened
// bound — settles back into range on the first press rather than treating the
// far edge as "already there" and wrapping past it.
function decrement() {
  if (value.value > max) return void (value.value = max)

  if (value.value <= min) {
    if (wrap && Number.isFinite(max)) value.value = max
    return
  }
  value.value = clamp((Math.ceil(value.value / step) - 1) * step)
}

function increment() {
  if (value.value < min) return void (value.value = min)

  if (value.value >= max) {
    if (wrap && Number.isFinite(min)) value.value = min
    return
  }
  value.value = clamp((Math.floor(value.value / step) + 1) * step)
}

// The field is `type="text"`, so the arrows the platform would spin a number input with do nothing
// until they are handled here — and only here, on the input, so they step the value while it holds
// focus and stay the page's arrows otherwise.
function onArrow(direction: 1 | -1) {
  if (direction === 1 ? !can_increment.value : !can_decrement.value) return

  if (direction === 1) increment()
  else decrement()

  emitSfx('select', { debounce: ARROW_SFX_DEBOUNCE_MS })
}
</script>

<template>
  <div data-testid="ui-kit-spinbox-container" class="flex w-max flex-col gap-1">
    <label v-if="label" data-testid="ui-kit-spinbox__label" class="text-ink-muted">
      {{ label }}
    </label>

    <div
      data-testid="ui-kit-spinbox"
      class="inline-flex items-center bg-well rounded-4 p-1 gap-0.5"
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
          class="text-center tabular-nums text-ink bg-transparent outline-none text-lg px-2 w-12"
          :value="display_value"
          :step="step"
          @beforeinput="onBeforeInput"
          @focus="onFocus"
          @input="onInput"
          @blur="onBlur"
          @keydown.up.prevent="onArrow(1)"
          @keydown.down.prevent="onArrow(-1)"
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
