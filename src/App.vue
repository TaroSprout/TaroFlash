<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNoticeStore } from '@/stores/notice-store'
import NoticeToast from '@/components/ui-kit/notice/toast.vue'
import NoticePanel from '@/components/ui-kit/notice/panel.vue'
import UiModal from '@/components/ui-kit/modal.vue'
import { springScaleIn } from '@/utils/animations/modal'
import { noticeToastListLeave } from '@/utils/animations/notice-toast'
import audio_player from '@/sfx/player'
import { installAudioLifecycle } from '@/sfx/lifecycle'
import { useSessionStore } from '@/stores/session'
import { onMounted, onBeforeUnmount } from 'vue'
import logger from '@/utils/logger'
import { useThemeStore } from '@/stores/theme'
import { useMemberStore } from '@/stores/member'
import { withMemberPreferencesDefaults, toBusVolumes } from '@/utils/member/preferences'
import { watch } from 'vue'

const { t } = useI18n()
const notice = useNoticeStore()
const session = useSessionStore()
const theme = useThemeStore()
const member = useMemberStore()

watch(
  () => member.error,
  (err) => {
    if (!err) return

    notice.error(t('member.load-error'), {
      subMessage: t('member.load-error-sub'),
      variant: 'panel',
      closable: false,
      actions: [{ label: t('notice.refresh-label'), onClick: () => location.reload() }]
    })
  }
)

watch(
  () => member.preferences,
  (prefs) => {
    const resolved = withMemberPreferencesDefaults(prefs)
    document.documentElement.setAttribute(
      'data-left-hand',
      String(resolved.accessibility.left_hand)
    )
    audio_player.setVolumeConfig(toBusVolumes(resolved.audio))
  },
  { immediate: true, deep: true }
)

let teardownAudioLifecycle: (() => void) | undefined

const scheduleIdle =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (cb: () => void) => (window as any).requestIdleCallback(cb, { timeout: 3000 })
    : (cb: () => void) => setTimeout(cb, 0)

onMounted(() => {
  // navigator.standalone is iOS Safari's legacy fallback — display-mode alone misses
  // older iOS versions that never adopted the media-feature check.
  const is_standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  document.documentElement.setAttribute('data-standalone', String(is_standalone))

  try {
    theme.load()
    session.startLoading()
  } catch (e: any) {
    logger.error(e.message, e)
  } finally {
    session.stopLoading()
  }

  scheduleIdle(() => {
    audio_player
      .setup()
      .then(() => {
        teardownAudioLifecycle = installAudioLifecycle()
      })
      .catch((e: any) => logger.error(e.message, e))
  })
})

onBeforeUnmount(() => {
  teardownAudioLifecycle?.()
})
</script>

<template>
  <router-view />

  <teleport to="[notice-toast-container]">
    <transition-group
      :css="false"
      move-class="transition-transform duration-200 ease-out"
      @enter="springScaleIn"
      @leave="noticeToastListLeave"
    >
      <notice-toast
        v-for="item in notice.toast_notices"
        :key="item.id"
        :notice="item"
        @close="notice.removeNotice"
      />
    </transition-group>
  </teleport>

  <teleport to="[notice-panel-container]">
    <notice-panel
      v-for="item in notice.panel_notices"
      :key="item.id"
      :notice="item"
      @close="notice.removeNotice"
    />
  </teleport>

  <teleport to="[data-testid='app-modal-container']">
    <ui-modal />
  </teleport>
</template>
