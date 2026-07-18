<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import DangerDeleteAccountButton from '../danger-delete-account-button.vue'
import { windowLayoutKey } from '@/components/layout-kit/paged-window/layout'

const { t } = useI18n()
const layout_mode = inject(windowLayoutKey)!
</script>

<template>
  <section-list
    data-testid="tab-danger-zone"
    class="px-(--settings-padding)"
    :class="layout_mode === 'phone' && 'pb-24'"
  >
    <labeled-section
      :label="t('settings.danger-zone.section.delete-account')"
      :description="t('settings.danger-zone.delete-account-description')"
    >
      <danger-delete-account-button />
    </labeled-section>
  </section-list>
</template>
