<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import { pacingFieldsKey } from './use-pacing-fields'
import { presetActionsKey } from './use-preset-actions'

type PresetAction = 'fork' | 'push' | 'rename' | 'delete'

const { t } = useI18n()
const { preset_options, selected_preset_value, override_count } = inject(pacingFieldsKey)!
const { is_system_preset, has_overrides, busy, onFork, onPush, onRename, onDelete } =
  inject(presetActionsKey)!

const ACTION_HANDLERS: Record<PresetAction, () => Promise<void>> = {
  fork: onFork,
  push: onPush,
  rename: onRename,
  delete: onDelete
}

const selected_preset_label = computed(
  () => preset_options.value.find((option) => option.value === selected_preset_value.value)?.label
)

// Push/rename/delete all rewrite the followed preset, so they're absent on the
// system preset — it's shared app-wide and can only be forked away from.
const action_options = computed<DropdownOption[]>(() => {
  const actions: DropdownOption[] = [
    {
      value: 'fork',
      label: t('deck.settings-modal.review-pacing.fork-action'),
      icon: 'new-file-dash',
      separator: true
    }
  ]

  if (is_system_preset.value) return actions

  return [
    ...actions,
    {
      value: 'push',
      label: t('deck.settings-modal.review-pacing.push-action', override_count.value),
      icon: 'arrow-circle-up',
      disabled: !has_overrides.value
    },
    {
      value: 'rename',
      label: t('deck.settings-modal.review-pacing.rename-action'),
      icon: 'pencil'
    },
    { value: 'delete', label: t('deck.settings-modal.review-pacing.delete-action'), icon: 'delete' }
  ]
})

const options = computed<DropdownOption[]>(() => [
  ...preset_options.value.map((option) => ({
    ...option,
    selected: option.value === selected_preset_value.value
  })),
  ...action_options.value
])

function onSelect(option: DropdownOption) {
  const action = ACTION_HANDLERS[option.value as PresetAction]
  if (action) return void action()

  selected_preset_value.value = option.value as string
}
</script>

<template>
  <ui-dropdown-button
    data-testid="preset-chip"
    size="sm"
    open-on-trigger
    :disabled="busy"
    :options="options"
    @select="onSelect"
  >
    {{ selected_preset_label }}
  </ui-dropdown-button>
</template>
