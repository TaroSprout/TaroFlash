<script setup lang="ts" generic="T extends string">
import UiPopover from '@/components/ui-kit/popover.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { computed, ref } from 'vue'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'

defineOptions({ inheritAttrs: false })

type SelectOption = {
  value: T
  label: string
}

const {
  options,
  modelValue,
  menuTheme = 'brown-200',
  menuThemeDark = 'stone-700',
  menuClass
} = defineProps<{
  options: SelectOption[]
  modelValue: T
  menuTheme?: Theme
  menuThemeDark?: Theme
  menuClass?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

const open = ref(false)

const current_label = computed(() => options.find((o) => o.value === modelValue)?.label ?? '')

function toggle() {
  emitSfx('snappy_button_5')
  open.value = !open.value
}

function select(value: T) {
  emitSfx('generic_button_15')
  emit('update:modelValue', value)
  open.value = false
}
</script>

<template>
  <div
    data-testid="ui-select-field"
    data-theme="brown-200"
    data-theme-dark="stone-700"
    v-bind="$attrs"
  >
    <ui-popover
      :open="open"
      position="bottom-start"
      :gap="4"
      :transition_duration="0"
      :use_arrow="false"
      match_reference_width
      @close="open = false"
    >
      <template #trigger>
        <button
          type="button"
          data-testid="ui-select-field__trigger"
          :data-active="open"
          class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-4 px-3 py-2 text-base text-(--theme-on-primary) transition-colors bg-(--theme-primary) hover:bgx-diagonal-stripes hover:bgx-opacity-10"
          v-sfx="{ hover: TYPE_SFX }"
          @click="toggle"
        >
          <span>{{ current_label }}</span>
          <ui-icon
            src="arrow-drop-down"
            class="size-5 shrink-0 transition-transform"
            :class="open ? 'rotate-180' : ''"
          />
        </button>
      </template>

      <div
        data-testid="ui-select-field__menu"
        :data-theme="menuTheme"
        :data-theme-dark="menuThemeDark"
        class="flex flex-col overflow-hidden rounded-4 bg-(--theme-primary) p-1.5 text-(--theme-on-primary)"
        :class="menuClass"
      >
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          :data-active="option.value === modelValue"
          data-testid="ui-select-field__option"
          class="group/opt relative flex w-full cursor-pointer items-center overflow-hidden rounded-3 px-3 py-2 text-base text-start whitespace-nowrap transition-colors data-[active=true]:font-medium"
          v-sfx="{ hover: TYPE_SFX }"
          @click="select(option.value)"
        >
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 hidden bgx-diagonal-stripes bgx-color-[var(--theme-neutral)] animation-safe:bgx-slide group-hover/opt:block"
          ></div>
          <span class="relative">{{ option.label }}</span>
        </button>
      </div>
    </ui-popover>
  </div>
</template>
