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
      class="group/notice-toast relative rounded-4 pointer-events-auto grid grid-cols-[auto_1fr] items-center w-72 gap-x-4 gap-y-3 bg-brown-300 dark:bg-stone-700 p-4 text-brown-700 dark:text-brown-100 drop-shadow-sm"
    >
      <ui-icon
        :src="NOTICE_ICON[notice.state]"
        class="size-7.5 place-self-center text-(--theme-primary)"
      />

      <div data-testid="ui-kit-notice-toast__body" class="flex flex-1 flex-col">
        <p class="text-lg">{{ notice.message }}</p>
        <p class="text-brown-500" v-if="notice.subMessage">{{ notice.subMessage }}</p>
      </div>

      <div
        v-if="notice.actions?.length"
        data-testid="ui-kit-notice-toast__actions"
        class="col-span-2 w-full flex gap-1 justify-end"
      >
        <ui-button
          v-for="action in notice.actions"
          data-theme="brown-100"
          data-theme-dark="stone-900"
          :key="action.label"
          size="sm"
          @press="action.onClick"
        >
          {{ action.label }}
        </ui-button>
      </div>

      <ui-button
        data-testid="ui-kit-notice-toast__close"
        data-theme="brown-100"
        data-theme-dark="stone-900"
        icon-only
        icon-left="close"
        class="absolute! -right-2 -top-2 opacity-0 transition-opacity group-hover/notice-toast:opacity-100 group-focus-within/notice-toast:opacity-100"
        @press="closeToast"
      >
        {{ t('notice.close-label') }}
      </ui-button>
    </div>
  </Transition>
</template>
