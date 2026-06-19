<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { coverBindings } from '@/utils/cover'
import { withMemberCardCoverDefaults } from '@/utils/member/defaults'
import UiImage from '@/components/ui-kit/image.vue'

type MemberBadgeProps = {
  displayName?: string
  description?: string
  cover?: DeckCover
}

const { displayName, description, cover } = defineProps<MemberBadgeProps>()

const { t } = useI18n()

const body_bindings = computed(() =>
  coverBindings(withMemberCardCoverDefaults(cover), { border: false })
)
</script>

<template>
  <div
    data-testid="member-badge"
    v-bind="body_bindings"
    style="--badge-radius: 42px; --badge-padding: 14px"
    class="flex items-center gap-4 rounded-[var(--badge-radius)] overflow-hidden p-[var(--badge-padding)] bg-(--theme-primary)"
  >
    <div
      data-testid="member-badge__avatar"
      class="bg-brown-300 dark:bg-stone-900 rounded-[calc(var(--badge-radius)_-_var(--badge-padding)_+_6px)] border-brown-300 dark:border-stone-900 h-25 w-25 overflow-hidden shrink-0 border-4"
    >
      <ui-image src="_default" class="h-full w-full" />
    </div>

    <div data-testid="member-badge__info" class="flex flex-col min-w-0 flex-1">
      <span data-testid="member-badge__name" class="font-semibold text-3xl text-brown-100 truncate">
        {{ displayName || t('member-badge.name-placeholder') }}
      </span>
      <span
        data-testid="member-badge__description"
        class="text-sm text-brown-100 dark:text-grey-900"
      >
        {{ description || t('member-badge.description-fallback') }}
      </span>
    </div>
  </div>
</template>
