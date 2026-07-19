<script setup lang="ts" generic="T extends string | number">
import UiTappable from '@/components/ui-kit/tappable.vue'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'

type UiOptionGroupProps<V> = {
  options: { value: V; label: string }[]
  full_width?: boolean
  size?: 'sm' | 'base'
}

const { size = 'sm', full_width = false } = defineProps<UiOptionGroupProps<T>>()

const active = defineModel<T>('value', { required: true })

const emit = defineEmits<{ (e: 'update:value', value: T): void }>()

function onTap(value: T) {
  emitSfx(value === active.value ? 'digi_powerdown' : 'snappy_button_5')
  emit('update:value', value)
}
</script>

<template>
  <div
    data-testid="ui-option-group"
    class="bg-panel gap-1 p-1"
    :class="[
      size === 'base' ? 'rounded-3.5 ' : 'rounded-2.5',
      full_width ? 'flex w-full' : 'inline-flex w-fit'
    ]"
  >
    <ui-tappable
      v-for="option in options"
      :key="String(option.value)"
      v-sfx="{ hover: option.value === active ? undefined : TYPE_SFX }"
      as="button"
      type="button"
      data-testid="ui-option-group__option"
      :data-active="option.value === active"
      bgx_color="var(--color-brown-500)"
      :class="[
        'cursor-pointer text-ink-muted data-[active=false]:hover:bg-brown-300 dark:data-[active=false]:hover:bg-stone-900 data-[active=true]:bg-(--color-accent) data-[active=true]:text-(--color-on-accent)',
        size === 'base' ? 'py-2 px-4 text-base rounded-3' : 'py-1.5 px-3.5 text-sm rounded-2',
        full_width && 'flex-1 justify-center'
      ]"
      @tap="onTap(option.value)"
    >
      {{ option.label }}
    </ui-tappable>
  </div>
</template>
