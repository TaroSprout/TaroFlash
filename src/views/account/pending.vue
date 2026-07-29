<script setup lang="ts">
// Where a member lands while their account is pending deletion. Sign-in is not
// blocked — they still get a session, and the router diverts them here instead
// of the dashboard, because a hard block would make the restore below
// unreachable (no session means no auth.uid(), so nothing to restore with).
//
// Deliberately plain: layout gets tuned once the flow is proven.
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useQueryCache } from '@pinia/colada'
import UiButton from '@/components/ui-kit/button.vue'
import { restoreAccount } from '@/api/session'
import { useMemberStore } from '@/stores/member'
import { useSessionStore } from '@/stores/session'
import { useNoticeStore } from '@/stores/notice-store'
import logger from '@/utils/logger'

const { t, locale } = useI18n()
const router = useRouter()
const member = useMemberStore()
const session = useSessionStore()
const notice = useNoticeStore()
const queryCache = useQueryCache()

const restoring = ref(false)

const restore_by = computed(() => {
  if (!member.delete_at) return ''

  return new Date(member.delete_at).toLocaleDateString(locale.value, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
})

async function onRestore() {
  restoring.value = true

  try {
    await restoreAccount()
  } catch (e) {
    logger.error(`Restore failed: ${(e as Error).message}`)
    notice.error(t('toast.error.account-restore-failed'))
    return
  } finally {
    restoring.value = false
  }

  // While suspended, every member-owned query resolved to an empty result and
  // cached it. Those entries are all wrong now, so drop the cache wholesale the
  // same way a fresh login does — no per-key invalidation is worth enumerating
  // when the answer is "everything the member owns just came back".
  queryCache.getEntries().forEach((entry) => queryCache.remove(entry))

  notice.success(t('toast.success.account-restored'))
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-(--page-width) flex-col items-start gap-6 p-8 text-ink"
    data-testid="account-pending__root"
  >
    <h1 class="text-4xl" data-testid="account-pending__heading">
      {{ t('account-pending.heading') }}
    </h1>

    <p class="text-lg leading-relaxed" data-testid="account-pending__message">
      {{ t('account-pending.message', { date: restore_by }) }}
    </p>

    <div class="flex flex-wrap gap-3" data-testid="account-pending__actions">
      <UiButton
        :loading="restoring"
        :sfx="{ press: 'music_plink_ok' }"
        data-testid="account-pending__restore"
        @press="onRestore"
      >
        {{ t('account-pending.restore-button') }}
      </UiButton>

      <UiButton
        neutral
        variant="outline"
        data-testid="account-pending__sign-out"
        @press="session.logout()"
      >
        {{ t('account-pending.sign-out-button') }}
      </UiButton>
    </div>
  </div>
</template>
