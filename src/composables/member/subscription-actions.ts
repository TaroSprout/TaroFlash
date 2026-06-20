import { useI18n } from 'vue-i18n'
import { useCancelSubscriptionMutation, useResumeSubscriptionMutation } from '@/api/billing'
import { useAlert } from '@/composables/alert'
import { useToast } from '@/composables/toast'

/**
 * Subscription lifecycle orchestrators for the billing plan section. Owns the
 * cancel/resume billing mutations and surfaces their loading state, plus the
 * cancel confirm-alert and the success/error toasts. `onCancel` is a no-op when
 * the member dismisses the confirm-alert.
 *
 * @example
 * const { onCancel, onResume, canceling, resuming } = useSubscriptionActions()
 */
export function useSubscriptionActions() {
  const { t } = useI18n()
  const alert = useAlert()
  const toast = useToast()
  const cancelMutation = useCancelSubscriptionMutation()
  const resumeMutation = useResumeSubscriptionMutation()

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
      toast.success(t('settings.subscription.plan.cancel-success'))
    } catch {
      toast.error(t('settings.subscription.plan.cancel-error'))
    }
  }

  async function onResume() {
    try {
      await resumeMutation.mutateAsync()
      toast.success(t('settings.subscription.plan.resume-success'))
    } catch {
      toast.error(t('settings.subscription.plan.resume-error'))
    }
  }

  return {
    onCancel,
    onResume,
    canceling: cancelMutation.isLoading,
    resuming: resumeMutation.isLoading
  }
}
