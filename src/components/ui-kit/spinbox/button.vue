<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTappable from '@/components/ui-kit/tappable.vue'

type SpinboxButtonProps = {
  icon: string
  disabled?: boolean
}

const { icon, disabled = false } = defineProps<SpinboxButtonProps>()

const emit = defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <ui-tappable
    as="button"
    type="button"
    :disabled="disabled"
    :sfx="{ hover: 'ui.hover', press: 'select' }"
    bgx_color="var(--color-accent-pattern)"
    class="inline-flex items-center justify-center aspect-square h-8 rounded-3 text-ink cursor-pointer transition-[background-color,color] duration-100 hover:bg-accent hover:text-on-accent data-[tap-active=true]:bg-accent data-[tap-active=true]:text-on-accent disabled:opacity-disabled disabled:hover:bg-transparent disabled:hover:text-ink"
    @tap="emit('click')"
  >
    <ui-icon :src="icon" class="size-4" />
  </ui-tappable>
</template>
