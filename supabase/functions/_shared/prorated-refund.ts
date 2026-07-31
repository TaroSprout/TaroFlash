// Cancelling a subscription immediately means the member has paid for time they
// will not get. This module cancels and hands that money back.
//
// WE NEVER DO PAYMENT MATH. The obvious implementation —
// (period_end - now) / (period_end - period_start) × amount_paid — is wrong in
// ways that only show up in production: proration is computed on daily
// boundaries, timezones and DST shift those boundaries, coupons and discounts
// apply before or after depending on the discount, tiered and metered prices
// aren't linear in time, and a mid-period plan change leaves proration line
// items already sitting on the subscription. Every one of those is real money.
//
// So Stripe computes the figure and we read it:
//   1. invoices.createPreview({ ..., cancel_now: true }) asks Stripe what
//      cancelling right now would credit, without committing to anything.
//   2. subscriptions.cancel({ prorate: true, invoice_now: true }) commits.
//   3. A credit note against the paid invoice turns that credit into cash.
//
// Why a credit note and not a bare refund: Stripe's proration lands as a
// customer credit balance, which is worthless to somebody who will never be
// billed again. A credit note both moves the money and attaches it to the
// invoice, so tax and revenue reporting stay correct — a standalone refund is
// an unattached payment event with no relationship to what was invoiced.

import type { Stripe } from './stripe.ts'

export type StripeRefundLike = Pick<Stripe, 'subscriptions' | 'invoices' | 'creditNotes'>

export type ProratedRefundOutcome =
  | { refunded: true; amountCents: number; currency: string; creditNoteId: string }
  | {
      refunded: false
      reason:
        | 'nothing_unused' // trial, $0 invoice, or cancelled at the very end of a period
        | 'no_paid_invoice' // never successfully charged
        | 'already_refunded' // a previous run already credited this invoice
        | 'refund_failed' // disputed/already-refunded charge — logged, not fatal
    }

/**
 * What cancelling right now would credit, in minor units. Stripe's number, not
 * ours. Zero when there's nothing unused to give back.
 */
export async function previewCancellationCredit(
  stripe: StripeRefundLike,
  customerId: string,
  subscriptionId: string
): Promise<number> {
  try {
    const preview = await stripe.invoices.createPreview({
      customer: customerId,
      subscription: subscriptionId,
      subscription_details: { cancel_now: true }
    })

    // A net credit shows up as a negative total. A positive total means there's
    // uninvoiced usage owed to us instead, which is not something to refund.
    return preview.total < 0 ? Math.abs(preview.total) : 0
  } catch (err) {
    // No upcoming invoice to preview (already cancelled, no active period).
    console.warn('Cancellation preview failed, treating credit as 0:', err)
    return 0
  }
}

/**
 * The most recent invoice this subscription actually collected money on, or null.
 * A credit-note refund has to point at a specific paid invoice — that's the
 * payment being reversed.
 */
async function findLastPaidInvoice(
  stripe: StripeRefundLike,
  subscriptionId: string
): Promise<Stripe.Invoice | null> {
  const invoices = await stripe.invoices.list({
    subscription: subscriptionId,
    status: 'paid',
    limit: 1
  })

  return invoices.data[0] ?? null
}

/**
 * Issues a credit note that refunds `amountCents` against `invoice`, capped by
 * what that invoice can still give back. Omit `amountCents` to refund the whole
 * remaining amount — used when a charge should never have been collected at all,
 * as opposed to part of a period going unused.
 *
 * Refunds are irreversible, so the cap is load-bearing: `amount_paid` minus
 * what credit notes have already returned. A retry of a run that already
 * refunded finds nothing left and reports `already_refunded` instead of paying
 * the member twice.
 */
export async function refundInvoiceViaCreditNote(
  stripe: StripeRefundLike,
  invoice: Stripe.Invoice,
  amountCents?: number
): Promise<ProratedRefundOutcome> {
  const alreadyCredited = invoice.post_payment_credit_notes_amount ?? 0
  const refundable = invoice.amount_paid - alreadyCredited

  if (refundable <= 0) return { refunded: false, reason: 'already_refunded' }

  const amount = Math.min(amountCents ?? refundable, refundable)
  if (amount <= 0) return { refunded: false, reason: 'nothing_unused' }

  try {
    const creditNote = await stripe.creditNotes.create({
      invoice: invoice.id!,
      amount,
      // Creates the actual refund against the invoice's charge. Without this the
      // credit note would only park the money on the customer's balance.
      refund_amount: amount,
      reason: 'order_change',
      memo: 'Prorated refund for unused subscription time'
    })

    return {
      refunded: true,
      amountCents: amount,
      currency: invoice.currency,
      creditNoteId: creditNote.id
    }
  } catch (err) {
    // A disputed charge, or one already refunded outside this flow, makes Stripe
    // throw. That must not fail the cancellation — the member asked to cancel,
    // and the cancellation itself has already succeeded by this point. Loud log,
    // soft outcome.
    console.error('Credit-note refund failed:', err)
    return { refunded: false, reason: 'refund_failed' }
  }
}

/**
 * Cancels `subscriptionId` immediately and refunds the unused portion.
 *
 * Never throws for refund-side problems: the cancellation is the part the member
 * asked for, so a refund that can't be issued is reported in the outcome and
 * logged, not raised. A genuine failure to cancel does throw — the caller needs
 * to know billing is still live.
 *
 * Safe to call twice: the credit-note cap makes the refund idempotent, and
 * cancelling an already-cancelled subscription is a no-op to Stripe.
 *
 * NOT for `cancel_at_period_end` cancellations — access runs to the end of the
 * period there, so no time goes unused and nothing should be refunded.
 */
export async function cancelWithProratedRefund(
  stripe: StripeRefundLike,
  customerId: string,
  subscriptionId: string
): Promise<{ subscription: Stripe.Subscription; refund: ProratedRefundOutcome }> {
  const expectedCredit = await previewCancellationCredit(stripe, customerId, subscriptionId)

  // prorate → credit the unused time; invoice_now → settle it immediately rather
  // than leaving a pending proration item on a subscription about to disappear.
  const subscription = await stripe.subscriptions.cancel(subscriptionId, {
    prorate: true,
    invoice_now: true
  })

  if (expectedCredit <= 0) {
    return { subscription, refund: { refunded: false, reason: 'nothing_unused' } }
  }

  const invoice = await findLastPaidInvoice(stripe, subscriptionId)
  if (!invoice) {
    return { subscription, refund: { refunded: false, reason: 'no_paid_invoice' } }
  }

  const refund = await refundInvoiceViaCreditNote(stripe, invoice, expectedCredit)
  return { subscription, refund }
}
