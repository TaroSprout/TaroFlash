<script setup lang="ts">
type PlanPillProps = {
  name: string
  cost?: string | null
  description?: string | null
}

const { name, cost = null, description = null } = defineProps<PlanPillProps>()

defineSlots<{
  actions?: () => unknown
}>()
</script>

<template>
  <div data-testid="plan-pill" class="relative">
    <div
      v-if="$slots.actions"
      data-testid="plan-pill__actions"
      class="absolute -top-3.5 right-3 z-10 rotate-3"
    >
      <slot name="actions" />
    </div>

    <div
      data-testid="plan-pill__body"
      class="flex items-stretch gap-4 rounded-4 bg-(--theme-primary) bgx-leaf p-5 text-(--theme-on-primary)"
    >
      <div data-testid="plan-pill__primary" class="flex flex-1 flex-col gap-1">
        <p data-testid="plan-pill__name" class="text-lg">{{ name }}</p>
        <p v-if="description" data-testid="plan-pill__description" class="text-sm text-brown-200">
          {{ description }}
        </p>
      </div>

      <div
        v-if="cost"
        data-testid="plan-pill__cost"
        class="flex flex-col justify-center text-right"
      >
        <p data-testid="plan-pill__cost-value" class="text-lg">{{ cost }}</p>
      </div>
    </div>
  </div>
</template>
