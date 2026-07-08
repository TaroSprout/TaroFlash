<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { NOTICE_ICON, NOTICE_THEME } from './state-config'
import { springScaleIn, scaleFadeOut } from '@/utils/animations/modal'
import { type Notice } from '@/stores/notice-store'

type NoticePanelProps = {
  notice: Notice
}

const { notice } = defineProps<NoticePanelProps>()

const emit = defineEmits<{
  (e: 'close', notice: Notice): void
}>()

const { t } = useI18n()

const open = ref(false)
const timeout = ref<number>()

onMounted(() => {
  openPanel()
})

function openPanel(): void {
  open.value = true
  if (notice.persist) return

  timeout.value = window.setTimeout(() => {
    closePanel()
  }, notice.delay)
}

function closePanel(): void {
  clearTimeout(timeout.value)
  open.value = false
  notice.onDismiss?.()
}

function onLeave(el: Element, done: () => void) {
  scaleFadeOut(el, () => {
    done()
    emit('close', notice)
  })
}
</script>

<template>
  <Transition :css="false" @enter="springScaleIn" @leave="onLeave">
    <div
      v-if="open"
      data-testid="ui-kit-notice-panel"
      class="rounded-2 shadow-lg pointer-events-auto relative flex w-96 max-w-[calc(100vw-2rem)] flex-col items-center gap-4 bg-white p-8 text-center"
    >
      <ui-button
        data-testid="ui-kit-notice-panel__close"
        class="absolute top-2 right-2"
        icon-only
        icon-left="close"
        size="sm"
        variant="ghost"
        @press="closePanel"
      >
        {{ t('notice.close-label') }}
      </ui-button>

      <div
        data-testid="ui-kit-notice-panel__icon"
        :data-theme="NOTICE_THEME[notice.state]"
        :data-theme-dark="NOTICE_THEME[notice.state]"
        class="flex size-12 shrink-0 items-center justify-center rounded-full bg-(--theme-primary) text-(--theme-on-primary)"
      >
        <ui-icon :src="NOTICE_ICON[notice.state]" class="size-6" />
      </div>

      <div data-testid="ui-kit-notice-panel__body" class="flex flex-col gap-2">
        <p class="text-brown-700 text-lg">{{ notice.message }}</p>
        <p v-if="notice.subMessage" class="text-brown-500">{{ notice.subMessage }}</p>
      </div>

      <div
        v-if="notice.actions?.length"
        data-testid="ui-kit-notice-panel__actions"
        class="flex gap-2"
      >
        <ui-button
          v-for="action in notice.actions"
          :key="action.label"
          size="sm"
          variant="solid"
          @press="action.onClick"
        >
          {{ action.label }}
        </ui-button>
      </div>
    </div>
  </Transition>
</template>
