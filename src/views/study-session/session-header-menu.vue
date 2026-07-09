<script setup lang="ts">
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

type SessionHeaderMenuProps = {
  can_edit?: boolean
  show_all_ratings?: boolean
}

const { can_edit = false, show_all_ratings = false } = defineProps<SessionHeaderMenuProps>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'move'): void
  (e: 'delete'): void
  (e: 'toggle-ratings'): void
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
    label: t(
      show_all_ratings
        ? 'study-session.flashcard.menu.enable-simple-ratings'
        : 'study-session.flashcard.menu.disable-simple-ratings'
    ),
    value: 'toggle-ratings',
    icon: 'half-star'
  }
])

function onSelect(option: DropdownOption) {
  if (option.value === 'toggle-ratings') emit('toggle-ratings')
  if (option.value === 'edit') emit('edit')
  if (option.value === 'move') emit('move')
  if (option.value === 'delete') emit('delete')
}
</script>

<template>
  <ui-dropdown-button
    data-testid="session-header__menu"
    trigger-only
    trigger-icon="pencil"
    variant="ghost"
    position="bottom-end"
    trigger-theme="brown-100"
    trigger-theme-dark="stone-700"
    menu-theme="brown-100"
    menu-theme-dark="stone-700"
    :options="menu_options"
    @select="onSelect"
  />
</template>
