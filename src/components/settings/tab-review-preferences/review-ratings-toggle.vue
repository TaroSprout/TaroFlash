<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiOptionGroup from '@/components/ui-kit/option-group.vue'

const { t } = useI18n()

const model = defineModel<boolean>('value', { required: true })

const options = computed(() => [
  { value: 'simple', label: t('settings.review-preferences.ratings.simple') },
  { value: 'advanced', label: t('settings.review-preferences.ratings.advanced') }
])

const active = computed(() => (model.value ? 'advanced' : 'simple'))

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
