<script setup lang="ts">
import SessionCounter from './session-counter.vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

type SessionHeaderProps = {
  editing: boolean
  saving: boolean
  current_index: number
  total: number
  is_cover: boolean
  can_edit: boolean
}

const { can_edit } = defineProps<SessionHeaderProps>()

const emit = defineEmits<{
  (e: 'edit'): void
}>()

const { t } = useI18n()

const menu_options = computed<DropdownOption[]>(() => [
  { label: t('study-session.flashcard.menu.edit'), value: 'edit', icon: 'edit' }
])

function onSelect(option: DropdownOption) {
  if (option.value === 'edit') emit('edit')
}
</script>

<template>
  <header
    data-testid="session-header"
    class="w-full grid items-center justify-items-center grid-cols-[40px_1fr_40px] gap-2"
  >
    <session-counter
      :editing="editing"
      :saving="saving"
      :current_index="current_index"
      :total="total"
      :is_cover="is_cover"
      class="col-start-2"
    />

    <ui-dropdown-button
      v-if="can_edit"
      data-testid="session-header__menu"
      trigger-only
      trigger-icon="screwdriver-wrench"
      position="bottom-end"
      trigger-theme="brown-200"
      trigger-theme-dark="stone-700"
      menu-theme="brown-100"
      menu-theme-dark="stone-700"
      :options="menu_options"
      @select="onSelect"
    />
  </header>
</template>
