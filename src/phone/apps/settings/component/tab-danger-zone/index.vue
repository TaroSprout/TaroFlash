<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import DangerDeleteAccountButton from '../danger-delete-account-button.vue'
import SettingsBackButton from '../settings-back-button.vue'

const { t } = useI18n()

const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <section-list data-testid="tab-danger-zone" class="p-(--settings-padding)">
    <settings-back-button @back="emit('back')" />

    <labeled-section
      :label="t('settings.danger-zone.section.delete-account')"
      :description="t('settings.danger-zone.delete-account-description')"
    >
      <danger-delete-account-button />
    </labeled-section>
  </section-list>
</template>
