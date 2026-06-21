<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'
import { coverBindings } from '@/utils/cover'

const PATTERN_SWATCH_SIZE: Record<DeckCoverPattern, string> = {
  'diagonal-stripes': '45px',
  saw: '39px',
  wave: '78px',
  'bank-note': '90px',
  aztec: '39px',
  'endless-clouds': '78px',
  leaf: '65px',
  squiggle: '45px'
}

type PatternPickerProps = {
  label: string
  supported_patterns: DeckCoverPattern[]
  selected_pattern: DeckCoverPattern | undefined
}

const { selected_pattern } = defineProps<PatternPickerProps>()

const emit = defineEmits<{
  (e: 'update:pattern', pattern: DeckCoverPattern | undefined): void
}>()

function swatchBindings(p: DeckCoverPattern) {
  return coverBindings({ pattern: p }, { border: false, patternSize: PATTERN_SWATCH_SIZE[p] })
}

function onPatternSelect(p: DeckCoverPattern | undefined) {
  if (p === selected_pattern) {
    emitSfx('digi_powerdown')
    return
  }

  emitSfx('toggle_on')
  emit('update:pattern', p)
}
</script>

<template>
  <div data-testid="pattern-picker-container" class="flex flex-col gap-2.5">
    <h3 data-testid="pattern-picker__label" class="text-brown-700 dark:text-brown-100">
      {{ label }}
    </h3>

    <div data-testid="pattern-picker" class="flex flex-wrap gap-2">
      <button
        v-for="pattern in supported_patterns"
        :key="pattern"
        :data-testid="`pattern-picker__option-${pattern}`"
        :data-selected="pattern === selected_pattern || undefined"
        v-sfx="{ hover: TYPE_SFX }"
        v-bind="swatchBindings(pattern)"
        class="w-14.5 aspect-square rounded-6 rounded-tr-3 rounded-bl-3 cursor-pointer bg-(--theme-primary) hover:ring-4 data-selected:ring-4 ring-white relative"
        @click="onPatternSelect(pattern)"
      >
        <div
          v-if="pattern === selected_pattern"
          class="absolute -top-2 -right-2 bg-white p-1.5 size-6.5 rounded-full flex items-center justify-center"
        >
          <ui-icon src="check" class="text-(--theme-primary)" />
        </div>
      </button>
    </div>
  </div>
</template>
