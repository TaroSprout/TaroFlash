<script setup lang="ts">
import MobileDock from '@/components/mobile-dock/mobile-dock.vue'
import FooterActions from './footer-actions.vue'

type DashboardMobileFooterProps = {
  editing_decks?: boolean
}

defineProps<DashboardMobileFooterProps>()

const emit = defineEmits<{
  'toggle-edit-decks': []
}>()
</script>

<template>
  <mobile-dock>
    <footer-actions :editing_decks="editing_decks" @toggle-edit-decks="emit('toggle-edit-decks')" />
  </mobile-dock>
</template>
