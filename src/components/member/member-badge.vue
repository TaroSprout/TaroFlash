<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { memberCoverBindings } from './cover'
import AvatarImage from './avatar-image.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiTappable from '@/components/ui-kit/tappable.vue'
import type { SfxOptions } from '@/sfx/directive'

type MemberBadgeProps = {
  displayName?: string
  description?: string
  cover?: MemberCover
  sfx?: SfxOptions
  editable?: boolean
}

const { displayName, description, cover, sfx, editable = false } = defineProps<MemberBadgeProps>()
defineSlots<{ actions?: () => any; description?: () => any }>()
const emit = defineEmits<{ click: [e: MouseEvent]; 'edit-avatar': [] }>()

const { t } = useI18n()

const body_bindings = computed(() => memberCoverBindings(cover))

function onEditAvatar(e: MouseEvent) {
  e.stopPropagation()
  emit('edit-avatar')
}
</script>

<template>
  <ui-tappable
    as="div"
    :sfx="sfx"
    data-testid="member-badge"
    v-bind="body_bindings"
    style="--badge-radius: 42px; --badge-padding: 14px"
    class="card-outline pointer-fine:hover:scale-101 data-[tap-active=true]:scale-101 pointer-coarse:data-[tap-active=true]:scale-105 pointer-fine:transition-transform duration-75 cursor-pointer touch-manipulation select-none flex items-center gap-4 rounded-(--badge-radius) p-(--badge-padding) bg-(--color-accent)"
    @tap="emit('click', $event)"
  >
    <div data-testid="member-badge__avatar" class="relative shrink-0">
      <div
        class="bg-mat rounded-[calc(var(--badge-radius)-var(--badge-padding)+6px)] border-panel h-25 w-25 overflow-hidden border-4"
      >
        <avatar-image :avatar="cover?.avatar" class="h-full w-full" />
      </div>

      <ui-button
        neutral
        v-if="editable"
        data-testid="member-badge__avatar-edit"
        icon-left="pencil"
        icon-only
        class="absolute! -top-2 -right-2"
        @press="onEditAvatar"
      >
        {{ t('member-badge.avatar-edit-button') }}
      </ui-button>
    </div>

    <div data-testid="member-badge__info" class="flex flex-col min-w-0 flex-1">
      <span data-testid="member-badge__name" class="font-semibold text-3xl text-brown-100 truncate">
        {{ displayName || t('member-badge.name-placeholder') }}
      </span>
      <div data-testid="member-badge__description" class="text-sm text-brown-100 wrap-break-word">
        <slot name="description">{{ description || t('member-badge.description-fallback') }}</slot>
      </div>
    </div>

    <slot name="actions" />
  </ui-tappable>
</template>
