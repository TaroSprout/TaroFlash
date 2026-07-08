<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { NOTICE_ICON, NOTICE_THEME, NOTICE_THEME_DARK } from './state-config'
import { emitSfx } from '@/sfx/bus'
import { type Notice, type NoticeAction } from '@/stores/notice-store'

type NoticeToastProps = {
  notice: Notice
}

const { notice } = defineProps<NoticeToastProps>()

const emit = defineEmits<{
  (e: 'close', notice: Notice): void
}>()

const { t } = useI18n()

let timeout: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  if (notice.sfx?.open) emitSfx(notice.sfx.open)
  if (notice.persist) return
  timeout = setTimeout(closeToast, notice.delay)
})

onBeforeUnmount(() => clearTimeout(timeout))

function closeToast(): void {
  clearTimeout(timeout)
  notice.onDismiss?.()
  emit('close', notice)
}

function onActionClick(action: NoticeAction) {
  action.onClick()
  if (action.closesOnClick) closeToast()
}
</script>

<template>
  <div
    data-testid="ui-kit-notice-toast"
    :data-theme="NOTICE_THEME[notice.state]"
    :data-theme-dark="NOTICE_THEME_DARK[notice.state]"
    class="group/notice-toast relative rounded-4 pointer-events-auto grid grid-cols-[auto_1fr] items-center w-full xs:w-72 gap-x-4 gap-y-3 bg-brown-50 dark:bg-stone-700 p-4 text-brown-700 dark:text-brown-100 drop-shadow-sm border-t border-l border-brown-200 dark:border-grey-900"
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
        data-theme="brown-200"
        data-theme-dark="stone-900"
        :key="action.label"
        size="sm"
        :sfx="{ press: action.sfx?.press ?? 'snappy_button_5' }"
        @press="onActionClick(action)"
      >
        {{ action.label }}
      </ui-button>
    </div>

    <ui-button
      v-if="notice.closable"
      data-testid="ui-kit-notice-toast__close"
      data-theme="brown-200"
      data-theme-dark="stone-900"
      icon-only
      icon-left="close"
      class="absolute! -right-2 -top-2 opacity-0 transition-opacity group-hover/notice-toast:opacity-100 group-focus-within/notice-toast:opacity-100 pointer-coarse:opacity-100"
      :sfx="{ press: 'snappy_button_5' }"
      @press="closeToast"
    >
      {{ t('notice.close-label') }}
    </ui-button>
  </div>
</template>
