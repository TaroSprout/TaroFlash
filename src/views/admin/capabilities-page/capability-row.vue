<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiToggle from '@/components/ui-kit/toggle.vue'
import { useUpdateCapabilityMutation } from '@/api/capabilities'

const { item } = defineProps<{ item: Capability }>()

const { t } = useI18n()
const updateCapability = useUpdateCapabilityMutation()

function onToggle(next: boolean) {
  updateCapability.mutate({ key: item.key, state: next ? 'on' : 'off' })
}
</script>

<template>
  <div
    data-testid="admin-capabilities-row"
    data-station="panel"
    class="bg-surface rounded-8 flex w-full items-center gap-4 p-6"
  >
    <ui-toggle
      data-testid="admin-capabilities-row__toggle"
      class="w-full"
      :checked="item.state === 'on'"
      @update:checked="(value) => onToggle(Boolean(value))"
    >
      <span class="flex flex-col gap-1">
        <span data-testid="admin-capabilities-row__name" class="text-ink text-lg">
          {{ t(`admin.capabilities.${item.key}.name`) }}
        </span>
        <span data-testid="admin-capabilities-row__description" class="text-ink-muted text-base">
          {{ t(`admin.capabilities.${item.key}.description`) }}
        </span>
      </span>
    </ui-toggle>
  </div>
</template>
