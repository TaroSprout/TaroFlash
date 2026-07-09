<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import { mobileCardEditorKey } from './use-mobile-card-editor'

const { t } = useI18n()

const { saving, has_image, image_controls, moveCard, deleteCard } = inject(mobileCardEditorKey)!

const menu_options = computed<DropdownOption[]>(() => {
  const image: DropdownOption[] = !image_controls.value
    ? []
    : has_image.value
      ? [
          {
            label: t('deck-view.mobile-editor.replace-image'),
            value: 'image-add',
            icon: 'add-image'
          },
          {
            label: t('deck-view.mobile-editor.remove-image'),
            value: 'image-remove',
            icon: 'remove-image'
          }
        ]
      : [{ label: t('deck-view.mobile-editor.add-image'), value: 'image-add', icon: 'add-image' }]

  return [
    ...image,
    { label: t('deck-view.mobile-editor.move-card'), value: 'move', icon: 'move-item' },
    { label: t('deck-view.mobile-editor.delete-card'), value: 'delete', icon: 'delete' }
  ]
})

function onMenuSelect(option: DropdownOption) {
  if (option.value === 'image-add') image_controls.value?.openPicker()
  else if (option.value === 'image-remove') image_controls.value?.onRemove()
  else if (option.value === 'move') moveCard()
  else if (option.value === 'delete') deleteCard()
}
</script>

<template>
  <div data-testid="mobile-card-editor__header-end" class="flex items-center gap-2">
    <span v-if="saving" data-testid="mobile-card-editor__saving">
      {{ t('deck-view.mobile-editor.saving') }}
    </span>

    <ui-dropdown-button
      data-testid="mobile-card-editor__menu"
      trigger-only
      trigger-icon="pencil"
      variant="ghost"
      position="bottom-end"
      trigger-theme="brown-100"
      trigger-theme-dark="stone-700"
      menu-theme="brown-100"
      menu-theme-dark="stone-700"
      menu-class="dark:outline-1 dark:outline-stone-900"
      :options="menu_options"
      @select="onMenuSelect"
    />
  </div>
</template>
