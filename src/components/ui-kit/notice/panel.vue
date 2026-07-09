<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { NOTICE_ICON, NOTICE_THEME, NOTICE_THEME_DARK } from './state-config'
import { useSwipeDismiss } from './use-swipe-dismiss'
import { usePausableTimer } from './use-pausable-timer'
import { springScaleIn, scaleFadeOut } from '@/utils/animations/modal'
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
  <Transition
    enter-from-class="opacity-0"
    enter-active-class="transition-opacity duration-100"
    leave-to-class="opacity-0"
    leave-active-class="transition-opacity duration-100"
  >
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
      :data-theme="NOTICE_THEME[notice.state]"
      :data-theme-dark="NOTICE_THEME_DARK[notice.state]"
      class="group/notice-panel rounded-4 drop-shadow-sm pointer-events-auto relative flex w-96 max-w-full flex-col items-center gap-6 bg-brown-50 dark:bg-stone-700 p-12 text-center border-t border-l border-brown-200 dark:border-grey-900"
    >
      <ui-button
        v-if="notice.closable"
        data-testid="ui-kit-notice-panel__close"
        data-theme="brown-200"
        data-theme-dark="stone-900"
        class="absolute! -top-2 -right-2 opacity-0 transition-opacity group-hover/notice-panel:opacity-100 group-focus-within/notice-panel:opacity-100 pointer-coarse:opacity-100"
        icon-only
        size="lg"
        icon-left="close"
        :sfx="{ press: 'snappy_button_5' }"
        @press="closePanel"
      >
        {{ t('notice.close-label') }}
      </ui-button>

      <div class="flex flex-col items-center gap-4">
        <ui-icon :src="NOTICE_ICON[notice.state]" class="size-12 text-(--theme-primary)" />

        <div data-testid="ui-kit-notice-panel__body" class="flex flex-col gap-2">
          <p class="text-brown-700 dark:text-brown-100 text-xl">{{ notice.message }}</p>
          <p v-if="notice.subMessage" class="text-brown-500">{{ notice.subMessage }}</p>
        </div>
      </div>

      <div
        v-if="notice.actions?.length"
        data-testid="ui-kit-notice-panel__actions"
        class="w-full flex gap-2"
      >
        <ui-button
          v-for="action in notice.actions"
          data-theme="brown-200"
          data-theme-dark="stone-900"
          :key="action.label"
          full-width
          :sfx="{ press: action.sfx?.press ?? 'snappy_button_5' }"
          @press="onActionClick(action)"
        >
          {{ action.label }}
        </ui-button>
      </div>
    </div>
  </Transition>
</template>
