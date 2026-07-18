<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import DangerResetButton from '../danger-reset-button.vue'
import DangerDeleteButton from '../danger-delete-button.vue'
import { sheetLayoutKey } from '@/components/layout-kit/sheet/sheet-layout'

const { t } = useI18n()
const layout_mode = inject(sheetLayoutKey)!
</script>

<template>
  <section-list
    data-testid="tab-danger-zone"
    class="px-(--deck-settings-padding)"
    :class="layout_mode === 'phone' && 'pb-24'"
  >
    <labeled-section
      :label="t('deck.settings-modal.danger-zone.section.reset-heading')"
      :description="t('deck.settings-modal.danger-zone.section.reset-description')"
    >
      <danger-reset-button />
    </labeled-section>

    <labeled-section
      :label="t('deck.settings-modal.danger-zone.section.delete-heading')"
      :description="t('deck.settings-modal.danger-zone.section.delete-description')"
    >
      <danger-delete-button />
    </labeled-section>
  </section-list>
</template>
