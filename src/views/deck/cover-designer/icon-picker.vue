<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { emitSfx } from '@/sfx/bus'
import UiIcon from '@/components/ui-kit/icon.vue'
import { coverIconPalette } from '@/utils/cover'

const { t } = useI18n()

type IconPickerProps = {
  supported_icons: string[]
  icon: string | undefined
  palette: PaletteName | undefined
}

const { icon, palette } = defineProps<IconPickerProps>()

const icon_palette = computed(() => coverIconPalette(palette))

const emit = defineEmits<{
  (e: 'update:icon', icon: string | undefined): void
}>()

function onIconSelect(value: string | undefined) {
  if (value === icon) {
    emitSfx('ui.deselect')
    return
  }

  emitSfx('ui.toggle-on')
  emit('update:icon', value)
}
</script>

<template>
  <div data-testid="icon-picker-container" class="flex flex-col gap-2.5">
    <h3 data-testid="icon-picker__label" class="text-ink">
      {{ t('deck.settings-modal.cover.icon-picker.label') }}
    </h3>
    <div data-testid="icon-picker" class="flex flex-wrap gap-2">
      <button
        v-for="name in supported_icons"
        :key="name"
        :data-testid="`icon-picker__option-${name}`"
        :data-selected="name === icon || undefined"
        v-sfx="{ hover: 'ui.hover' }"
        class="w-14.5 aspect-square rounded-6 cursor-pointer flex items-center justify-center bg-raised text-ink-muted [&_svg]:size-6 data-selected:bg-(--color-accent) hover:bg-(--color-accent) hover:text-(--color-accent-muted) hover:bgx-diagonal-stripes hover:bgx-opacity-10 data-selected:bgx-diagonal-stripes data-selected:bgx-opacity-10 transition-colors duration-75 hover:[&_svg]:scale-120 hover:[&_svg]:rotate-6"
        @click="onIconSelect(name)"
      >
        <ui-icon
          :src="name"
          :data-palette="icon_palette"
          :class="name === icon && 'text-(--color-accent)'"
        />
      </button>
    </div>
  </div>
</template>
