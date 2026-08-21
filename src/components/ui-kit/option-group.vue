<script setup lang="ts" generic="T extends string | number">
import UiTappable from '@/components/ui-kit/tappable.vue'
import { emitSfx } from '@/sfx/bus'

type UiOptionGroupProps<V> = {
  options: { value: V; label: string; disabled?: boolean }[]
  full_width?: boolean
  size?: 'sm' | 'base'
}

const { size = 'sm', full_width = false } = defineProps<UiOptionGroupProps<T>>()

const active = defineModel<T>('value', { required: true })

const emit = defineEmits<{ (e: 'update:value', value: T): void }>()

function onTap(option: UiOptionGroupProps<T>['options'][number]) {
  if (option.disabled) return

  emitSfx(option.value === active.value ? 'ui.rejected' : 'ui.select')
  emit('update:value', option.value)
}
</script>

<template>
  <div
    data-testid="ui-option-group"
    class="bg-well gap-1 p-1"
    :class="[
      size === 'base' ? 'rounded-3.5 ' : 'rounded-2.5',
      full_width ? 'flex w-full' : 'inline-flex w-fit'
    ]"
  >
    <ui-tappable
      v-for="option in options"
      :key="String(option.value)"
      :sfx="{ hover: option.value !== active && !option.disabled && 'ui.hover', press: false }"
      as="button"
      type="button"
      data-testid="ui-option-group__option"
      :disabled="option.disabled"
      :data-active="option.value === active"
      bgx_color="var(--color-raised-pattern)"
      :class="[
        'whitespace-nowrap text-ink-muted enabled:cursor-pointer disabled:opacity-disabled data-[active=false]:enabled:hover:bg-raised-tint data-[active=false]:enabled:hover:text-ink data-[active=true]:bg-(--color-accent) data-[active=true]:text-(--color-on-accent)',
        size === 'base' ? 'py-2 px-4 text-base rounded-3' : 'py-1.5 px-3.5 text-sm rounded-2',
        full_width && 'flex-1 justify-center'
      ]"
      @tap="onTap(option)"
    >
      {{ option.label }}
    </ui-tappable>
  </div>
</template>
