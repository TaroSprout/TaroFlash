import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useMutationSpy, useQueryCacheSpy, createSubscriptionMock, manageMocks } = vi.hoisted(
  () => ({
    useMutationSpy: vi.fn((cfg) => cfg),
    useQueryCacheSpy: vi.fn(() => ({ invalidateQueries: vi.fn() })),
    createSubscriptionMock: vi.fn().mockResolvedValue({
      clientSecret: 'cs_secret_x'
    }),
    manageMocks: {
      changePlan: vi.fn().mockResolvedValue({ subscription: { id: 'sub_1' } }),
      cancelSubscription: vi.fn().mockResolvedValue({ subscription: { id: 'sub_1' } }),
      resumeSubscription: vi.fn().mockResolvedValue({ subscription: { id: 'sub_1' } }),
      setDefaultPaymentMethod: vi.fn().mockResolvedValue({ customer: {} }),
      detachPaymentMethod: vi.fn().mockResolvedValue({ paymentMethod: { id: 'pm_1' } }),
      createSetupIntent: vi.fn().mockResolvedValue({ clientSecret: 'seti_secret_x' })
    }
  })
)

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: useQueryCacheSpy
}))

vi.mock('@/api/billing/db', () => ({
  createSubscription: createSubscriptionMock,
  ...manageMocks
}))

import { useCreateSubscriptionMutation } from '@/api/billing/mutations/use-create-subscription-mutation'
import { useChangePlanMutation } from '@/api/billing/mutations/use-change-plan-mutation'
import { useCancelSubscriptionMutation } from '@/api/billing/mutations/use-cancel-subscription-mutation'
import { useResumeSubscriptionMutation } from '@/api/billing/mutations/use-resume-subscription-mutation'
import { useSetDefaultPaymentMethodMutation } from '@/api/billing/mutations/use-set-default-payment-method-mutation'
import { useDetachPaymentMethodMutation } from '@/api/billing/mutations/use-detach-payment-method-mutation'
import { useCreateSetupIntentMutation } from '@/api/billing/mutations/use-create-setup-intent-mutation'

beforeEach(() => {
  useMutationSpy.mockClear()
  createSubscriptionMock.mockClear()
  Object.values(manageMocks).forEach((mock) => mock.mockClear())
})

function configFrom(hook) {
  hook()
  return useMutationSpy.mock.calls.at(-1)[0]
}

describe('useCreateSubscriptionMutation', () => {
  test('delegates to createSubscription with the caller args, including returnUrl', async () => {
    const { mutation } = configFrom(useCreateSubscriptionMutation)
    await mutation({ planId: 'paid', returnUrl: 'https://app.test' })
    expect(createSubscriptionMock).toHaveBeenCalledWith({
      planId: 'paid',
      returnUrl: 'https://app.test'
    })
  })

  test('returns whatever createSubscription resolved with', async () => {
    const { mutation } = configFrom(useCreateSubscriptionMutation)
    const result = await mutation({ planId: 'paid', returnUrl: 'https://app.test' })
    expect(result).toEqual({ clientSecret: 'cs_secret_x' })
  })
})

describe('useChangePlanMutation', () => {
  test('delegates to changePlan with the planId', async () => {
    const { mutation } = configFrom(useChangePlanMutation)
    await mutation('paid')
    expect(manageMocks.changePlan).toHaveBeenCalledWith('paid')
  })
})

describe('useCancelSubscriptionMutation', () => {
  test('delegates to cancelSubscription with the atPeriodEnd flag', async () => {
    const { mutation } = configFrom(useCancelSubscriptionMutation)
    await mutation(true)
    expect(manageMocks.cancelSubscription).toHaveBeenCalledWith(true)
  })
})

describe('useResumeSubscriptionMutation', () => {
  test('delegates to resumeSubscription', async () => {
    const { mutation } = configFrom(useResumeSubscriptionMutation)
    await mutation()
    expect(manageMocks.resumeSubscription).toHaveBeenCalled()
  })
})

describe('useSetDefaultPaymentMethodMutation', () => {
  test('delegates to setDefaultPaymentMethod with the id', async () => {
    const { mutation } = configFrom(useSetDefaultPaymentMethodMutation)
    await mutation('pm_1')
    expect(manageMocks.setDefaultPaymentMethod).toHaveBeenCalledWith('pm_1')
  })
})

describe('useDetachPaymentMethodMutation', () => {
  test('delegates to detachPaymentMethod with the id', async () => {
    const { mutation } = configFrom(useDetachPaymentMethodMutation)
    await mutation('pm_1')
    expect(manageMocks.detachPaymentMethod).toHaveBeenCalledWith('pm_1')
  })
})

describe('useCreateSetupIntentMutation', () => {
  test('delegates to createSetupIntent with the returnUrl', async () => {
    const { mutation } = configFrom(useCreateSetupIntentMutation)
    await mutation('https://app.test')
    expect(manageMocks.createSetupIntent).toHaveBeenCalledWith('https://app.test')
  })

  test('onSettled invalidates the payment-methods query', () => {
    const invalidateQueries = vi.fn()
    useQueryCacheSpy.mockReturnValueOnce({ invalidateQueries })
    const { onSettled } = configFrom(useCreateSetupIntentMutation)

    onSettled()

    expect(invalidateQueries).toHaveBeenCalledWith({ key: ['billing', 'payment-methods'] })
  })
})
