<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { NOTICE_ICON, NOTICE_PALETTE } from './state-config'
import { useSwipeDismiss } from './use-swipe-dismiss'
import { usePausableTimer } from './use-pausable-timer'
import { springScaleIn, scaleFadeOut } from '@/utils/animations/modal'
import { defineMotion } from '@/utils/motion/driver'
import { motionTransition } from '@/utils/motion/transition'
import { emitSfx } from '@/sfx/bus'
import { type Notice, type NoticeAction } from '@/stores/notice-store'

type NoticePanelProps = {
  notice: Notice
}

const { notice } = defineProps<NoticePanelProps>()

const emit = defineEmits<{
  (e: 'close', notice: Notice): void
}>()

const { t } = useI18n()

const open = ref(false)
const panel_ref = ref<HTMLElement | null>(null)

const backdropFade = motionTransition(
  defineMotion({ from: { opacity: 0 }, to: { opacity: 1 }, duration: 100, clearOnComplete: true }),
  defineMotion({ to: { opacity: 0 }, duration: 100 })
)

useSwipeDismiss(panel_ref, { directions: ['up', 'down'], onDismiss: () => closePanel() })
const { stop: stopAutoClose } = usePausableTimer(panel_ref, closePanel, {
  delay: notice.delay,
  persist: notice.persist
})

onMounted(() => {
  if (notice.sfx?.open) emitSfx(notice.sfx.open)
  open.value = true
})

function closePanel(): void {
  stopAutoClose()
  open.value = false
  notice.onDismiss?.()
}

function onLeave(el: Element, done: () => void) {
  scaleFadeOut(el, () => {
    done()
    emit('close', notice)
  })
}

function onActionClick(action: NoticeAction) {
  action.onClick()
  if (action.closesOnClick) closePanel()
}
</script>

<template>
  <Transition :css="false" @enter="backdropFade.onEnter" @leave="backdropFade.onLeave">
    <div
      v-if="open && notice.backdrop"
      data-testid="ui-kit-notice-panel-backdrop"
      class="pointer-events-auto fixed inset-0 backdrop-blur-4 bg-black/10"
    />
  </Transition>

  <Transition :css="false" @enter="springScaleIn" @leave="onLeave">
    <div
      v-if="open"
      ref="panel_ref"
      data-testid="ui-kit-notice-panel"
      :data-palette="NOTICE_PALETTE[notice.state]"
      data-station="float"
      class="group/notice-panel rounded-4 bevel-drop-sm pointer-events-auto relative flex w-96 max-w-full flex-col items-center gap-6 bg-surface p-12 text-center"
    >
      <ui-button
        neutral
        v-if="notice.closable"
        data-testid="ui-kit-notice-panel__close"
        class="absolute! -top-2 -right-2 [--btn-bg-color:var(--color-well)]! opacity-0 transition-opacity group-hover/notice-panel:opacity-100 group-focus-within/notice-panel:opacity-100 pointer-coarse:opacity-100"
        icon-only
        size="lg"
        icon-left="close"
        :sfx="{ press: 'ui.press' }"
        @press="closePanel"
      >
        {{ t('notice.close-label') }}
      </ui-button>

      <div class="flex flex-col items-center gap-4">
        <ui-icon :src="NOTICE_ICON[notice.state]" class="size-12 text-(--color-accent-text)" />

        <div data-testid="ui-kit-notice-panel__body" class="flex flex-col gap-2">
          <p class="text-ink text-xl">{{ notice.message }}</p>
          <p v-if="notice.subMessage" class="text-ink-muted">{{ notice.subMessage }}</p>
        </div>
      </div>

      <div
        v-if="notice.actions?.length"
        data-testid="ui-kit-notice-panel__actions"
        class="w-full flex gap-2"
      >
        <ui-button
          neutral
          v-for="action in notice.actions"
          :key="action.label"
          full-width
          :sfx="{ press: action.sfx?.press || 'ui.press' }"
          @press="onActionClick(action)"
        >
          {{ action.label }}
        </ui-button>
      </div>
    </div>
  </Transition>
</template>
