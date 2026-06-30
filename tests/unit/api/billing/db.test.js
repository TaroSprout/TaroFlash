import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const mocks = vi.hoisted(() => ({
  invokeMock: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: {
    functions: { invoke: mocks.invokeMock }
  }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

import {
  createSubscription,
  getSubscription,
  listInvoices,
  listPaymentMethods,
  setDefaultPaymentMethod,
  detachPaymentMethod,
  createSetupIntent,
  changePlan,
  cancelSubscription,
  resumeSubscription
} from '@/api/billing/db'

beforeEach(() => {
  mocks.invokeMock.mockReset()
})

describe('createSubscription', () => {
  test('invokes create-subscription edge function with the planId + returnUrl body', async () => {
    mocks.invokeMock.mockResolvedValueOnce({
      data: { clientSecret: 'cs_x' },
      error: null
    })
    const result = await createSubscription({ planId: 'paid', returnUrl: 'https://app.test' })
    expect(mocks.invokeMock).toHaveBeenCalledWith('create-subscription', {
      body: { planId: 'paid', returnUrl: 'https://app.test' }
    })
    expect(result).toEqual({ clientSecret: 'cs_x' })
  })

  test('throws when the function returns no clientSecret', async () => {
    mocks.invokeMock.mockResolvedValueOnce({ data: {}, error: null })
    await expect(
      createSubscription({ planId: 'paid', returnUrl: 'https://app.test' })
    ).rejects.toThrow()
  })

  test('throws when the edge function returns an error', async () => {
    const err = new Error('boom')
    mocks.invokeMock.mockResolvedValueOnce({ data: null, error: err })
    await expect(
      createSubscription({ planId: 'paid', returnUrl: 'https://app.test' })
    ).rejects.toBe(err)
  })
})

describe('manage-subscription wrappers', () => {
  beforeEach(() => {
    mocks.invokeMock.mockResolvedValue({ data: {}, error: null })
  })

  test('getSubscription dispatches with action=get-subscription', async () => {
    mocks.invokeMock.mockResolvedValueOnce({
      data: { subscription: null, upcoming: null },
      error: null
    })
    const result = await getSubscription()
    expect(mocks.invokeMock).toHaveBeenCalledWith('manage-subscription', {
      body: { action: 'get-subscription' }
    })
    expect(result).toEqual({ subscription: null, upcoming: null })
  })

  test('listInvoices passes limit arg', async () => {
    await listInvoices(10)
    expect(mocks.invokeMock).toHaveBeenCalledWith('manage-subscription', {
      body: { action: 'list-invoices', limit: 10 }
    })
  })

  test('listInvoices allows limit to be omitted', async () => {
    await listInvoices()
    const [, opts] = mocks.invokeMock.mock.calls[0]
    expect(opts.body.action).toBe('list-invoices')
    expect(opts.body.limit).toBeUndefined()
  })

  test('listPaymentMethods dispatches with action=list-payment-methods', async () => {
    await listPaymentMethods()
    expect(mocks.invokeMock).toHaveBeenCalledWith('manage-subscription', {
      body: { action: 'list-payment-methods' }
    })
  })

  test('setDefaultPaymentMethod forwards the paymentMethodId', async () => {
    await setDefaultPaymentMethod('pm_1')
    expect(mocks.invokeMock).toHaveBeenCalledWith('manage-subscription', {
      body: { action: 'set-default-payment-method', paymentMethodId: 'pm_1' }
    })
  })

  test('detachPaymentMethod forwards the paymentMethodId', async () => {
    await detachPaymentMethod('pm_1')
    expect(mocks.invokeMock).toHaveBeenCalledWith('manage-subscription', {
      body: { action: 'detach-payment-method', paymentMethodId: 'pm_1' }
    })
  })

  test('createSetupIntent dispatches with action=create-setup-intent and the returnUrl', async () => {
    await createSetupIntent('https://app.test')
    expect(mocks.invokeMock).toHaveBeenCalledWith('manage-subscription', {
      body: { action: 'create-setup-intent', returnUrl: 'https://app.test' }
    })
  })

  test('changePlan forwards the planId', async () => {
    await changePlan('paid')
    expect(mocks.invokeMock).toHaveBeenCalledWith('manage-subscription', {
      body: { action: 'change-plan', planId: 'paid' }
    })
  })

  test('cancelSubscription forwards the atPeriodEnd flag', async () => {
    await cancelSubscription(true)
    expect(mocks.invokeMock).toHaveBeenCalledWith('manage-subscription', {
      body: { action: 'cancel', atPeriodEnd: true }
    })
  })

  test('resumeSubscription dispatches with action=resume', async () => {
    await resumeSubscription()
    expect(mocks.invokeMock).toHaveBeenCalledWith('manage-subscription', {
      body: { action: 'resume' }
    })
  })

  test('throws when the edge function returns an error', async () => {
    const err = new Error('edge down')
    mocks.invokeMock.mockResolvedValueOnce({ data: null, error: err })
    await expect(getSubscription()).rejects.toBe(err)
  })

  test('throws when the edge function returns no data', async () => {
    mocks.invokeMock.mockResolvedValueOnce({ data: null, error: null })
    await expect(getSubscription()).rejects.toThrow('manage-subscription returned no data')
  })
})
