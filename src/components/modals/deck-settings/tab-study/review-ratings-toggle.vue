<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiOptionGroup from '@/components/ui-kit/option-group.vue'
import { DECK_CONFIG_DEFAULTS } from '@/utils/deck/defaults'

const { t } = useI18n()

const model = defineModel<boolean | undefined>('value')

const options = computed(() => [
  { value: 'simple', label: t('deck.settings-modal.study.review-ratings.simple') },
  { value: 'advanced', label: t('deck.settings-modal.study.review-ratings.advanced') }
])

const active = computed(() =>
  (model.value ?? DECK_CONFIG_DEFAULTS.show_all_ratings) ? 'advanced' : 'simple'
)

function onSelect(value: string) {
  model.value = value === 'advanced'
}
</script>

<template>
  <ui-option-group
    data-testid="review-ratings-toggle"
    :options="options"
    :value="active"
    @update:value="onSelect"
  />
</template>
