<script setup lang="ts">
import { computed } from 'vue'
import MemberSectionBadge from './badge.vue'
import MemberSectionActionsPanel from './actions-panel.vue'
import { useLocalRef } from '@/composables/storage/local-ref'

type MemberSectionProps = {
  due_decks: Deck[]
}

const { due_decks } = defineProps<MemberSectionProps>()

const show_dashboard_actions = useLocalRef('dashboard.show_dashboard_actions', false)

const actions_open = computed(() => show_dashboard_actions.value && due_decks.length > 0)

function onBadgeClick() {
  if (due_decks.length === 0) return
  show_dashboard_actions.value = !show_dashboard_actions.value
}
</script>

<template>
  <div data-testid="dashboard__member-section" class="relative flex flex-col gap-3">
    <member-section-badge
      :due_decks="due_decks"
      :show_expand_button="!show_dashboard_actions && due_decks.length > 0"
      @click="onBadgeClick"
    />

    <div
      v-if="actions_open"
      data-testid="dashboard__binder-rings"
      class="absolute top-29.5 z-10 w-full flex justify-between px-14 pointer-events-none"
    >
      <div class="h-8 w-4.25 rounded-full bg-brown-500 ring-3 ring-brown-100 dark:ring-grey-900" />
      <div class="h-8 w-4.25 rounded-full bg-brown-500 ring-3 ring-brown-100 dark:ring-grey-900" />
    </div>

    <member-section-actions-panel :due_decks="due_decks" :open="actions_open" />
  </div>
</template>
