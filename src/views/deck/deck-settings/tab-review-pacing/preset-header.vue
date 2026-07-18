<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import UiDivider from '@/components/ui-kit/divider.vue'
import { pacingFieldsKey } from './pacing-fields'

const { t } = useI18n()
const { preset_options, selected_preset_value } = inject(pacingFieldsKey)!

const selected_preset_label = computed(
  () => preset_options.value.find((option) => option.value === selected_preset_value.value)?.label
)

function onSelect(option: DropdownOption) {
  selected_preset_value.value = option.value as string
}
</script>

<template>
  <div data-testid="preset-header" class="flex flex-col gap-1">
    <i18n-t
      keypath="deck.settings-modal.review-pacing.preset-line"
      tag="h3"
      data-testid="preset-header__line"
      class="flex flex-wrap items-center gap-1.5 text-xl text-brown-700 dark:text-brown-100"
    >
      <template #preset>
        <ui-dropdown-button
          data-testid="preset-header__preset"
          data-theme="brown-100"
          data-theme-dark="stone-700"
          menu-theme="brown-100"
          menu-theme-dark="stone-700"
          variant="ghost"
          open-on-trigger
          :options="preset_options"
          @select="onSelect"
        >
          {{ selected_preset_label }}
        </ui-dropdown-button>
      </template>
    </i18n-t>

    <p data-testid="preset-header__description" class="text-sm text-brown-500">
      {{ t('deck.settings-modal.review-pacing.preset-description') }}
    </p>

    <ui-divider class="mt-3" />
  </div>
</template>
