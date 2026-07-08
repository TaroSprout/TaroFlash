<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { NOTICE_ICON, NOTICE_THEME } from './state-config'
import { noticeToastEnter, noticeToastLeave } from '@/utils/animations/notice-toast'
import { type Notice } from '@/stores/notice-store'

type NoticeToastProps = {
  notice: Notice
}

const { notice } = defineProps<NoticeToastProps>()

const emit = defineEmits<{
  (e: 'close', notice: Notice): void
}>()

const { t } = useI18n()

const open = ref(false)
const timeout = ref<number>()

onMounted(() => {
  openToast()
})

function openToast(): void {
  open.value = true
  if (notice.persist) return

  timeout.value = window.setTimeout(() => {
    closeToast()
  }, notice.delay)
}

function closeToast(): void {
  clearTimeout(timeout.value)
  open.value = false
  notice.onDismiss?.()
}

function onLeave(el: Element, done: () => void) {
  noticeToastLeave(el, () => {
    done()
    emit('close', notice)
  })
}
</script>

<template>
  <Transition :css="false" @enter="noticeToastEnter" @leave="onLeave">
    <div
      v-if="open"
      data-testid="ui-kit-notice-toast"
      :data-theme="NOTICE_THEME[notice.state]"
      :data-theme-dark="NOTICE_THEME[notice.state]"
      class="rounded-8 pointer-events-auto flex w-72 items-start gap-3 bg-(--theme-primary) p-4 text-(--theme-on-primary) shadow-lg"
    >
      <ui-icon :src="NOTICE_ICON[notice.state]" class="mt-0.5 size-5 shrink-0" />

      <div data-testid="ui-kit-notice-toast__body" class="flex flex-1 flex-col gap-2">
        <p>{{ notice.message }}</p>
        <p v-if="notice.subMessage" class="opacity-80">{{ notice.subMessage }}</p>

        <div
          v-if="notice.actions?.length"
          data-testid="ui-kit-notice-toast__actions"
          class="flex gap-2"
        >
          <ui-button
            v-for="action in notice.actions"
            :key="action.label"
            size="sm"
            variant="outline"
            inverted
            @press="action.onClick"
          >
            {{ action.label }}
          </ui-button>
        </div>
      </div>

      <ui-button
        data-testid="ui-kit-notice-toast__close"
        icon-only
        icon-left="close"
        size="sm"
        variant="ghost"
        inverted
        @press="closeToast"
      >
        {{ t('notice.close-label') }}
      </ui-button>
    </div>
  </Transition>
</template>
