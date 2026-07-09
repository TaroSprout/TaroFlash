import { useI18n } from 'vue-i18n'
import { useCancelSubscriptionMutation, useResumeSubscriptionMutation } from '@/api/billing'
import { useAlert } from '@/composables/alert'
import { useNoticeStore } from '@/stores/notice-store'
import { useModal } from '@/composables/modal'
import Checkout from '@/components/modals/checkout/index.vue'

/**
 * Subscription lifecycle orchestrators for the billing plan section: upgrade a
 * free member (opens checkout), cancel at period end (confirm-alert + mutation),
 * and resume a canceling plan. Owns the cancel/resume billing mutations and
 * surfaces their loading state, plus the notices. `onCancel` is a no-op when the
 * member dismisses the confirm-alert.
 *
 * @example
 * const { onUpgrade, onCancel, onResume, canceling, resuming } = useSubscriptionActions()
 */
export function useSubscriptionActions() {
  const { t } = useI18n()
  const alert = useAlert()
  const notice = useNoticeStore()
  const modal = useModal()
  const cancelMutation = useCancelSubscriptionMutation()
  const resumeMutation = useResumeSubscriptionMutation()

  async function onUpgrade() {
    const { response } = modal.open(Checkout, { mode: 'popup', backdrop: true })
    await response
  }

  async function onCancel() {
    const { response } = alert.warn({
      title: t('settings.subscription.plan.cancel-confirm-title'),
      message: t('settings.subscription.plan.cancel-confirm'),
      confirmLabel: t('settings.subscription.plan.cancel-confirm-button'),
      cancelLabel: t('settings.subscription.plan.cancel-abort')
    })
    if (!(await response)) return

    try {
      await cancelMutation.mutateAsync(true)
      notice.success(t('settings.subscription.plan.cancel-success'), { variant: 'panel' })
    } catch {
      notice.error(t('settings.subscription.plan.cancel-error'), { variant: 'panel' })
    }
  }

  async function onResume() {
    try {
      await resumeMutation.mutateAsync()
      notice.success(t('settings.subscription.plan.resume-success'), { variant: 'panel' })
    } catch {
      notice.error(t('settings.subscription.plan.resume-error'), { variant: 'panel' })
    }
  }

  return {
    onUpgrade,
    onCancel,
    onResume,
    canceling: cancelMutation.isLoading,
    resuming: resumeMutation.isLoading
  }
}
