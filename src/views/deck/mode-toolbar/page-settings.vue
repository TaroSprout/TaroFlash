<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import UiPopover from '@/components/ui-kit/popover.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import { deckViewShellKey, type CardGridSize } from '@/composables/deck/view-shell'
import { inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { emitSfx } from '@/sfx/bus'

type SizeOption = {
  value: CardGridSize
  label_key: string
  preview: string
  radius: string
}

const { t } = useI18n()

const { grid_size, setGridSize } = inject(deckViewShellKey)!

const open = ref(false)

const size_options: SizeOption[] = [
  {
    value: 'base',
    label_key: 'deck-view.page-settings.card-size-small',
    preview: '32px',
    radius: '8px'
  },
  {
    value: 'md',
    label_key: 'deck-view.page-settings.card-size-base',
    preview: '40px',
    radius: '10px'
  },
  {
    value: 'xl',
    label_key: 'deck-view.page-settings.card-size-full',
    preview: '52px',
    radius: '12px'
  }
]

function toggle() {
  emitSfx('ui.snappy_button_5', { blocking: true })
  open.value = !open.value
}

function close() {
  open.value = false
}

function onSelectSize(value: CardGridSize) {
  if (grid_size.value === value) {
    emitSfx('ui.digi_powerdown')
    return
  }

  emitSfx('ui.select')
  setGridSize(value)
}
</script>

<template>
  <ui-popover
    :open="open"
    position="bottom"
    :gap="4"
    :transition_duration="0"
    shadow
    teleport
    data-testid="page-settings"
    @close="close"
  >
    <template #trigger>
      <ui-button
        data-testid="page-settings__trigger"
        data-theme="brown-300"
        data-theme-dark="stone-700"
        size="sm"
        icon-left="page-setting"
        icon-only
        :data-active="open"
        @click="toggle"
      >
        {{ t('deck-view.page-settings.trigger') }}
      </ui-button>
    </template>

    <template #arrow>
      <div class="size-full rotate-45 rounded-1 bg-brown-300 dark:bg-stone-700"></div>
    </template>

    <div
      data-testid="page-settings__panel"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      class="rounded-7 bg-brown-300 p-4 dark:bg-stone-700"
    >
      <section-list>
        <labeled-section :label="t('deck-view.page-settings.card-size-label')">
          <div
            data-testid="page-settings__card-size"
            class="grid grid-flow-col grid-rows-[1fr_auto] items-center justify-items-center gap-x-2.5 gap-y-2"
          >
            <template v-for="option in size_options" :key="option.value">
              <button
                type="button"
                role="radio"
                :aria-checked="grid_size === option.value"
                :data-testid="`page-settings__card-size-option-${option.value}`"
                :data-active="grid_size === option.value"
                class="flex h-18 w-16 cursor-pointer items-center justify-center rounded-4 outline outline-brown-100 transition-colors hover:bg-brown-500 dark:hover:bg-grey-900 hover:bgx-diagonal-stripes hover:bgx-opacity-10 data-[active=true]:bg-(--theme-primary) data-[active=true]:bgx-diagonal-stripes data-[active=true]:bgx-opacity-10"
                v-sfx="{ hover: grid_size === option.value ? undefined : 'ui.tap_05' }"
                @click="onSelectSize(option.value)"
              >
                <span
                  class="aspect-card bg-white dark:bg-grey-700"
                  :style="{ height: option.preview, borderRadius: option.radius }"
                ></span>
              </button>

              <span
                :data-testid="`page-settings__card-size-label-${option.value}`"
                class="text-sm text-brown-700 dark:text-brown-100"
              >
                {{ t(option.label_key) }}
              </span>
            </template>
          </div>
        </labeled-section>
      </section-list>
    </div>
  </ui-popover>
</template>
