<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

type SessionHeaderProps = {
  title?: string
  can_edit?: boolean
  is_cover?: boolean
  show_menu?: boolean
}

const { can_edit = false, show_menu = true } = defineProps<SessionHeaderProps>()

const title_el = useTemplateRef('title')
defineExpose({ title_el })

const emit = defineEmits<{
  (e: 'stop'): void
  (e: 'edit'): void
  (e: 'move'): void
  (e: 'delete'): void
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
  }
])

function onSelect(option: DropdownOption) {
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
      ref="title"
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
      trigger-icon="edit"
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
