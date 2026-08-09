import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'
import type { StripeInvoice, StripePaymentMethod, StripeSubscription } from '../stripe'

export type CreateSubscriptionArgs = { planId: string; returnUrl: string }
export type CreateSubscriptionResult = { clientSecret: string }

export async function createSubscription(
  args: CreateSubscriptionArgs
): Promise<CreateSubscriptionResult> {
  const { data, error } = await supabase.functions.invoke<CreateSubscriptionResult>(
    'create-subscription',
    { body: args }
  )

  if (error || !data?.clientSecret) {
    logger.error(error?.message ?? 'create-subscription returned no clientSecret')
    throw error ?? new Error('No clientSecret returned')
  }

  return data
}

type ManagePayload =
  | { action: 'get-subscription' }
  | { action: 'list-invoices'; limit?: number }
  | { action: 'list-payment-methods' }
  | { action: 'set-default-payment-method'; paymentMethodId: string }
  | { action: 'detach-payment-method'; paymentMethodId: string }
  | { action: 'create-setup-intent'; returnUrl: string }
  | { action: 'change-plan'; planId: string }
  | { action: 'cancel'; atPeriodEnd: boolean }
  | { action: 'resume' }

async function manage<T>(body: ManagePayload): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('manage-subscription', { body })
  if (error || data == null) {
    logger.error(error?.message ?? 'manage-subscription returned no data')
    throw error ?? new Error('manage-subscription returned no data')
  }
  return data
}

// Money is in the currency's smallest unit and the date is a UNIX second —
// both are formatted for display elsewhere.
export type SubscriptionView = {
  priceCents: number | null
  currency: string | null
  interval: 'day' | 'week' | 'month' | 'year' | null
  status: string
  currentPeriodEnd: number
  cancelAtPeriodEnd: boolean
  upcoming: { amountCents: number; currency: string } | null
}

export function getSubscription() {
  return manage<SubscriptionView | null>({ action: 'get-subscription' })
}

export function listInvoices(limit?: number) {
  return manage<{ invoices: StripeInvoice[] }>({ action: 'list-invoices', limit })
}

export function listPaymentMethods() {
  return manage<{
    paymentMethods: StripePaymentMethod[]
    defaultPaymentMethodId: string | null
  }>({ action: 'list-payment-methods' })
}

export function setDefaultPaymentMethod(paymentMethodId: string) {
  return manage<{ customer: unknown }>({
    action: 'set-default-payment-method',
    paymentMethodId
  })
}

export function detachPaymentMethod(paymentMethodId: string) {
  return manage<{ paymentMethod: StripePaymentMethod }>({
    action: 'detach-payment-method',
    paymentMethodId
  })
}

export function createSetupIntent(returnUrl: string) {
  return manage<{ clientSecret: string }>({ action: 'create-setup-intent', returnUrl })
}

export function changePlan(planId: string) {
  return manage<{ subscription: StripeSubscription }>({ action: 'change-plan', planId })
}

// `refunded: false` is a normal outcome, not a failure — a trial has nothing
// unused to give back.
export type ProratedRefundOutcome =
  | { refunded: true; amountCents: number; currency: string; creditNoteId: string }
  | { refunded: false; reason: string }

export function cancelSubscription(atPeriodEnd: boolean) {
  return manage<{ subscription: StripeSubscription; refund?: ProratedRefundOutcome }>({
    action: 'cancel',
    atPeriodEnd
  })
}

export function resumeSubscription() {
  return manage<{ subscription: StripeSubscription }>({ action: 'resume' })
}
