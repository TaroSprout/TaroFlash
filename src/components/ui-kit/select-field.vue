<script setup lang="ts" generic="T extends string">
import UiPopover from '@/components/ui-kit/popover.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { computed, ref } from 'vue'
import { TYPE_SFX } from '@/sfx/config'

type SelectOption = {
  value: T
  label: string
}

const { options, modelValue } = defineProps<{
  options: SelectOption[]
  modelValue: T
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

const open = ref(false)

const current_label = computed(() => options.find((o) => o.value === modelValue)?.label ?? '')

function toggle() {
  open.value = !open.value
}

function select(value: T) {
  emit('update:modelValue', value)
  open.value = false
}
</script>

<template>
  <ui-popover
    :open="open"
    position="bottom-start"
    :gap="4"
    :transition_duration="0"
    :use_arrow="false"
    match_reference_width
    data-testid="ui-select-field"
    @close="open = false"
  >
    <template #trigger>
      <button
        type="button"
        data-testid="ui-select-field__trigger"
        :data-active="open"
        class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-4 px-3 py-2 text-base outline outline-brown-100 transition-colors hover:bg-brown-500 hover:bgx-diagonal-stripes hover:bgx-opacity-10 dark:hover:bg-grey-900 data-[active=true]:bg-(--theme-primary) data-[active=true]:bgx-diagonal-stripes data-[active=true]:bgx-opacity-10 data-[active=true]:text-white"
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
      class="flex flex-col overflow-hidden rounded-4 bg-brown-300 p-1.5 outline outline-brown-100 dark:bg-stone-700"
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :data-active="option.value === modelValue"
        data-testid="ui-select-field__option"
        class="group/opt relative flex w-full cursor-pointer items-center overflow-hidden rounded-3 px-3 py-2 text-base text-start whitespace-nowrap text-brown-700 transition-colors dark:text-brown-100 data-[active=true]:font-medium data-[active=true]:text-(--theme-primary)"
        v-sfx="{ hover: option.value === modelValue ? undefined : TYPE_SFX }"
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
</template>
