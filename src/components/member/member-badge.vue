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
    class="flex items-center gap-3 rounded-3 overflow-hidden px-3 py-2.5 bg-(--theme-primary)"
  >
    <div
      data-testid="member-badge__avatar"
      class="h-12 w-12 rounded-full overflow-hidden shrink-0 border-3 border-brown-300 dark:border-stone-900"
    >
      <ui-image src="_default" class="h-full w-full" />
    </div>

    <div data-testid="member-badge__info" class="flex flex-col min-w-0 flex-1">
      <span
        data-testid="member-badge__name"
        class="font-semibold text-brown-700 dark:text-brown-100 truncate"
      >
        {{ displayName || t('member-badge.name-placeholder') }}
      </span>
      <span
        data-testid="member-badge__description"
        class="text-sm text-brown-100 dark:text-grey-900 truncate"
      >
        {{ description || t('member-badge.description-fallback') }}
      </span>
    </div>
  </div>
</template>
