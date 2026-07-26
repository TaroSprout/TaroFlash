<script setup lang="ts">
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

type SessionHeaderMenuProps = {
  can_edit?: boolean
}

const { can_edit = false } = defineProps<SessionHeaderMenuProps>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'move'): void
  (e: 'delete'): void
  (e: 'settings'): void
}>()

const { t } = useI18n()

const menu_options = computed<DropdownOption[]>(() => [
  {
    label: t('study-session.flashcard.menu.edit'),
    value: 'edit',
    icon: 'edit',
    disabled: !can_edit
  },
  {
    label: t('study-session.flashcard.menu.move'),
    value: 'move',
    icon: 'move-item',
    disabled: !can_edit
  },
  {
    label: t('study-session.flashcard.menu.delete'),
    value: 'delete',
    icon: 'delete',
    disabled: !can_edit
  },
  {
    label: t('study-session.flashcard.menu.settings'),
    value: 'settings',
    icon: 'screwdriver-wrench'
  }
])

function onSelect(option: DropdownOption) {
  if (option.value === 'edit') emit('edit')
  if (option.value === 'move') emit('move')
  if (option.value === 'delete') emit('delete')
  if (option.value === 'settings') emit('settings')
}
</script>

<template>
  <ui-dropdown-button
    data-testid="session-header__menu"
    trigger-only
    trigger-icon="hammer"
    variant="ghost"
    position="bottom-end"
    :options="menu_options"
    @select="onSelect"
  />
</template>
