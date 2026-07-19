<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'

type Horizontal = 'left' | 'center' | 'right'
type Vertical = 'top' | 'center' | 'bottom'

const horizontal = defineModel<Horizontal | undefined>('horizontal')
const vertical = defineModel<Vertical | undefined>('vertical')

const HORIZONTALS: Horizontal[] = ['left', 'center', 'right']
const VERTICALS: Vertical[] = ['top', 'center', 'bottom']

const ICONS: Record<Vertical, Record<Horizontal, string>> = {
  top: {
    left: 'align-top-left',
    center: 'align-top-center',
    right: 'align-top-right'
  },
  center: {
    left: 'align-middle-left',
    center: 'align-middle-center',
    right: 'align-middle-right'
  },
  bottom: {
    left: 'align-bottom-left',
    center: 'align-bottom-center',
    right: 'align-bottom-right'
  }
}

function isActive(h: Horizontal, v: Vertical) {
  return (horizontal.value ?? 'center') === h && (vertical.value ?? 'center') === v
}

function onSelect(h: Horizontal, v: Vertical) {
  if (isActive(h, v)) {
    emitSfx('digi_powerdown')
    return
  }
  emitSfx('etc_camera_shutter')
  // center/center is the implicit default — store undefined so the dirty check
  // treats it identically to the initial unset state.
  const is_default = h === 'center' && v === 'center'
  horizontal.value = is_default ? undefined : h
  vertical.value = is_default ? undefined : v
}
</script>

<template>
  <div
    data-testid="align-picker"
    class="grid grid-cols-3 gap-1 w-full bg-brown-100 dark:bg-stone-700 rounded-[22px] p-2"
  >
    <template v-for="v in VERTICALS" :key="v">
      <button
        v-for="h in HORIZONTALS"
        :key="`${h}-${v}`"
        :data-testid="`align-picker__cell-${h}-${v}`"
        :data-active="isActive(h, v)"
        class="aspect-square flex items-center justify-center rounded-5 cursor-pointer text-ink-muted data-[active=true]:bg-(--color-accent) data-[active=true]:text-(--color-on-accent) data-[active=true]:bgx-diagonal-stripes data-[active=true]:bgx-opacity-10 data-[active=false]:hover:bg-(--color-accent) data-[active=false]:hover:text-(--color-on-accent) data-[active=false]:hover:bgx-diagonal-stripes data-[active=false]:hover:bgx-opacity-10"
        @click="onSelect(h, v)"
        v-sfx="{ hover: TYPE_SFX }"
      >
        <ui-icon :src="isActive(h, v) ? ICONS[v][h] : 'dot'" />
      </button>
    </template>
  </div>
</template>
