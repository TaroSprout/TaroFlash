<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { DECK_CONFIG_DEFAULTS } from '@/utils/deck/defaults'

type SessionHeaderProps = {
  title?: string
  can_edit?: boolean
  is_cover?: boolean
  show_menu?: boolean
  show_all_ratings?: boolean
}

const {
  can_edit = false,
  show_menu = true,
  show_all_ratings = DECK_CONFIG_DEFAULTS.show_all_ratings
} = defineProps<SessionHeaderProps>()

const emit = defineEmits<{
  (e: 'stop'): void
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
  <header
    data-testid="session-header"
    class="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2"
  >
    <ui-button
      v-if="is_cover"
      data-testid="session-header__close"
      data-theme="brown-100"
      data-theme-dark="stone-700"
      icon-left="close"
      icon-only
      rounded-full
      class="justify-self-start"
      @press="emit('stop')"
    >
      {{ t('study-session.close-button') }}
    </ui-button>
    <ui-button
      v-else
      data-testid="session-header__stop"
      data-theme="brown-100"
      data-theme-dark="stone-700"
      icon-left="stop"
      rounded-full
      class="justify-self-start"
      @press="emit('stop')"
    >
      {{ t('study-session.stop-button') }}
    </ui-button>

    <h1
      data-testid="session-header__title"
      class="truncate text-center text-3xl font-bold text-brown-700 dark:text-brown-100"
    >
      {{ title }}
    </h1>

    <ui-dropdown-button
      v-if="show_menu"
      data-testid="session-header__menu"
      class="justify-self-end"
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
  </header>
</template>
