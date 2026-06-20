<script setup lang="ts">
import { computed } from 'vue'
import SpinboxButton from './button.vue'
import { useNumericInput } from '@/composables/ui/numeric-input'
import { useStagedTap } from '@/composables/ui/staged-tap'
import { TYPE_SFX } from '@/sfx/config'

type SpinboxProps = {
  min?: number
  max?: number
  step?: number
  label?: string
  suffix?: string
  wrap?: boolean
  /** When set, renders a connected pill button on the right; toggles `pill_active`. */
  pill_label?: string
}

const {
  min = -Infinity,
  max = Infinity,
  step = 1,
  label,
  suffix,
  wrap = false,
  pill_label
} = defineProps<SpinboxProps>()

const value = defineModel<number>('value', { required: true })
const pill_active = defineModel<boolean>('pill_active', { default: false })

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

const { playing: pill_playing, tap: tapPill } = useStagedTap({ triggerAt: 'press' })

function onPillClick(e: MouseEvent) {
  tapPill(
    () => {
      pill_active.value = !pill_active.value
    },
    { audio: 'select' }
  )(e)
}
</script>

<template>
  <div data-testid="ui-kit-spinbox-container" class="flex gap-1 w-max">
    <label
      v-if="label"
      data-testid="ui-kit-spinbox__label"
      class="text-brown-700 dark:text-brown-100"
    >
      {{ label }}
    </label>

    <div
      data-testid="ui-kit-spinbox"
      class="inline-flex items-center bg-input rounded-4 p-1 gap-0.5"
      :class="pill_label && 'rounded-r-2'"
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

    <button
      v-if="pill_label"
      type="button"
      data-testid="ui-kit-spinbox__pill"
      :data-active="pill_active"
      class="inline-flex items-center justify-center bg-input px-3 text-sm cursor-pointer text-brown-700 dark:text-brown-100 transition-colors rounded-4 rounded-l-2 data-[active=true]:bg-(--theme-primary) data-[active=true]:text-(--theme-on-primary) data-[active=false]:hover:bg-(--theme-primary) data-[active=false]:hover:text-(--theme-on-primary)"
      :data-playing="pill_playing || null"
      v-sfx="{ hover: TYPE_SFX }"
      @click="onPillClick"
    >
      {{ pill_label }}
    </button>
  </div>
</template>
