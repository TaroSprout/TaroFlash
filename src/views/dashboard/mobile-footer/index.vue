<script setup lang="ts">
import MobileDock from '@/components/mobile-dock/mobile-dock.vue'
import FooterActions from './footer-actions.vue'

type DashboardMobileFooterProps = {
  due_decks: Deck[]
  editing_decks?: boolean
  has_decks?: boolean
}

defineProps<DashboardMobileFooterProps>()

const emit = defineEmits<{
  'toggle-edit-decks': []
}>()
</script>

<template>
  <mobile-dock breakpoint="mxl">
    <footer-actions
      :due_decks="due_decks"
      :editing_decks="editing_decks"
      :has_decks="has_decks"
      @toggle-edit-decks="emit('toggle-edit-decks')"
    />
  </mobile-dock>
</template>
