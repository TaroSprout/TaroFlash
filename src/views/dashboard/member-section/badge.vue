<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'
import MemberBadge from '@/components/member/member-badge.vue'
import { useMemberStore } from '@/stores/member'

type MemberSectionBadgeProps = {
  due_decks: Deck[]
  show_expand_button: boolean
}

const { due_decks, show_expand_button } = defineProps<MemberSectionBadgeProps>()

const emit = defineEmits<{
  click: []
}>()

const member_store = useMemberStore()
</script>

<template>
  <member-badge
    :display-name="member_store.display_name"
    :description="member_store.description"
    :cover="member_store.cover"
    class="z-10"
    :sfx="{
      hover: 'tap_05',
      press: due_decks.length > 0 ? 'snappy_button_5' : 'digi_powerdown'
    }"
    @click="emit('click')"
  >
    <template #actions>
      <button
        v-if="show_expand_button"
        data-testid="member-badge__expand-button"
        class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20 flex h-5 w-10 cursor-pointer items-center justify-center rounded-full bg-brown-100 text-(--theme-primary) ring-4 ring-(--theme-primary)"
      >
        <ui-icon src="carat-down" class="h-4 w-4" />
      </button>
    </template>
  </member-badge>
</template>
