<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStagedTap } from '@/composables/ui/staged-tap'
import { memberCoverBindings } from './cover'
import UiImage from '@/components/ui-kit/image.vue'

type MemberBadgeProps = {
  displayName?: string
  description?: string
  cover?: DeckCover
}

const { displayName, description, cover } = defineProps<MemberBadgeProps>()

const { t } = useI18n()
const attrs = useAttrs()
const { playing, tap } = useStagedTap()

const body_bindings = computed(() => memberCoverBindings(cover, { patternOpacity: '0.15' }))

function onCaptureClick(e: MouseEvent) {
  const handler = attrs.onClick as ((ev: MouseEvent) => void) | undefined
  if (!handler) return
  tap(handler, { captureMode: true })(e)
}
</script>

<template>
  <div
    data-testid="member-badge"
    v-bind="body_bindings"
    style="--badge-radius: 42px; --badge-padding: 14px"
    class="card-outline pointer-fine:hover:scale-101 data-[playing=true]:scale-101 pointer-coarse:data-[playing=true]:scale-105 pointer-fine:transition-transform duration-75 cursor-pointer touch-manipulation flex items-center gap-4 rounded-(--badge-radius) overflow-hidden p-(--badge-padding) bg-(--theme-primary)"
    :data-playing="playing || null"
    v-sfx.hover="'ui.tap_05'"
    @click.capture="onCaptureClick"
  >
    <div
      data-testid="member-badge__avatar"
      class="bg-brown-300 dark:bg-stone-900 rounded-[calc(var(--badge-radius)-var(--badge-padding)+6px)] border-brown-300 dark:border-stone-900 h-25 w-25 overflow-hidden shrink-0 border-4"
    >
      <ui-image src="_default" class="h-full w-full" />
    </div>

    <div data-testid="member-badge__info" class="flex flex-col min-w-0 flex-1">
      <span data-testid="member-badge__name" class="font-semibold text-3xl text-brown-100 truncate">
        {{ displayName || t('member-badge.name-placeholder') }}
      </span>
      <span data-testid="member-badge__description" class="text-sm text-brown-100">
        {{ description || t('member-badge.description-fallback') }}
      </span>
    </div>
  </div>
</template>
