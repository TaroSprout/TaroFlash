<script setup lang="ts">
type PlanPillProps = {
  name: string
  cost?: string | null
}

const { name, cost = null } = defineProps<PlanPillProps>()

defineSlots<{
  meta?: () => unknown
  cta?: () => unknown
  actions?: () => unknown
}>()
</script>

<template>
  <div data-testid="plan-pill" class="relative">
    <div
      v-if="$slots.cta"
      data-testid="plan-pill__cta"
      class="absolute -top-3.5 right-3 z-10 rotate-3"
    >
      <slot name="cta" />
    </div>

    <div
      data-testid="plan-pill__body"
      class="flex items-stretch gap-4 rounded-4 bg-(--theme-primary) bgx-leaf p-5 text-(--theme-on-primary)"
    >
      <div data-testid="plan-pill__primary" class="flex flex-1 flex-col gap-1">
        <p data-testid="plan-pill__name" class="text-lg">{{ name }}</p>
        <div data-testid="plan-pill__meta" class="flex items-center gap-2 text-sm text-brown-200">
          <slot name="meta" />
        </div>
      </div>

      <div
        v-if="cost"
        data-testid="plan-pill__cost"
        class="flex flex-col justify-center text-right"
      >
        <p data-testid="plan-pill__cost-value" class="text-lg">{{ cost }}</p>
      </div>
    </div>

    <div
      v-if="$slots.actions"
      data-testid="plan-pill__actions"
      class="mt-3 flex flex-wrap items-center gap-3"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
