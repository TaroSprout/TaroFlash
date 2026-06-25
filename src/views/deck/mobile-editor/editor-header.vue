<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import { mobileCardEditorKey } from './use-mobile-card-editor'

const { t } = useI18n()

const { index, cards, saving, has_image, image_controls, close, moveCard, deleteCard } =
  inject(mobileCardEditorKey)!

const position = computed(() => ({ index: index.value + 1, total: cards.value.length }))

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
  <header
    data-testid="mobile-card-editor__header"
    class="grid w-full grid-cols-[1fr_auto_1fr] items-center text-base text-brown-500 dark:text-brown-100"
  >
    <ui-button
      data-testid="mobile-card-editor__done"
      icon-only
      icon-left="close"
      data-theme="brown-100"
      data-theme-dark="stone-700"
      class="justify-self-start"
      @press="close"
    >
      {{ t('deck-view.mobile-editor.done-button') }}
    </ui-button>

    <span data-testid="mobile-card-editor__position" class="justify-self-center">
      {{ t('deck-view.mobile-editor.position', position) }}
    </span>

    <div
      data-testid="mobile-card-editor__header-end"
      class="flex items-center gap-2 justify-self-end"
    >
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
  </header>
</template>
