<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiActionMenu from '@/components/ui-kit/action-menu.vue'

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'select'): void
  (e: 'move'): void
  (e: 'delete'): void
}>()

defineOptions({ inheritAttrs: false })
</script>

<template>
  <ui-action-menu
    class="absolute -top-1 -right-1"
    position="bottom-end"
    alignment="end"
    data-testid="grid-item__menu"
    :duration="0.4"
  >
    <template #trigger="{ toggle, is_open }">
      <ui-button
        data-theme="brown-300"
        data-theme-dark="stone-900"
        icon-only
        icon-right="more"
        data-testid="grid-item__menu-trigger"
        v-bind="$attrs"
        :class="{
          'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto':
            !is_open
        }"
        @click.stop="toggle"
      />
    </template>

    <ui-button data-theme="brown-300" data-theme-dark="stone-900" icon-only icon-right="edit">
      {{ t('deck-view.item-options.edit') }}
    </ui-button>
    <ui-button
      data-theme="brown-300"
      data-theme-dark="stone-900"
      icon-only
      icon-right="move-item"
      @click="emit('move')"
    >
      {{ t('deck-view.item-options.move') }}
    </ui-button>
    <ui-button data-theme="brown-300" data-theme-dark="stone-900" icon-only icon-right="reorder">
      {{ t('deck-view.item-options.reorder') }}
    </ui-button>
    <ui-button
      data-theme="brown-300"
      data-theme-dark="stone-900"
      icon-only
      icon-right="check"
      @click="emit('select')"
    >
      {{ t('deck-view.item-options.select') }}
    </ui-button>
    <ui-button
      data-theme="red-500"
      data-theme-dark="red-600"
      icon-only
      icon-right="delete"
      @click="emit('delete')"
    >
      {{ t('deck-view.item-options.delete') }}
    </ui-button>
  </ui-action-menu>
</template>
