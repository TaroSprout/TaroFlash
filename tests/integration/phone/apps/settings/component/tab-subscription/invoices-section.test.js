import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

const { queryState } = vi.hoisted(() => ({
  queryState: { isLoading: false, data: null }
}))

vi.mock('@/api/billing', () => ({
  useInvoicesQuery: () => ({
    isLoading: {
      get value() {
        return queryState.isLoading
      }
    },
    data: {
      get value() {
        return queryState.data
      }
    }
  })
}))

const LabeledSectionStub = defineComponent({
  name: 'LabeledSection',
  inheritAttrs: false,
  setup(_props, { slots }) {
    const attrs = useAttrs()
    return () => h('div', { ...attrs, 'data-testid': 'labeled-section-stub' }, slots.default?.())
  }
})

async function makeInvoicesSection() {
  const InvoicesSection = (
    await import('@/phone/apps/settings/component/tab-subscription/invoices-section.vue')
  ).default

  return shallowMount(InvoicesSection, {
    global: { stubs: { LabeledSection: LabeledSectionStub } }
  })
}

function invoice(id, overrides = {}) {
  return {
    id,
    number: `INV-${id}`,
    amount_paid: 1000,
    amount_due: 0,
    currency: 'usd',
    status: 'paid',
    created: 1800000000,
    hosted_invoice_url: `https://stripe/${id}`,
    invoice_pdf: `https://stripe/${id}.pdf`,
    ...overrides
  }
}

beforeEach(() => {
  queryState.isLoading = false
  queryState.data = null
})

describe('invoices-section', () => {
  test('shows the loading state while the query is pending', async () => {
    queryState.isLoading = true
    const wrapper = await makeInvoicesSection()
    expect(wrapper.find('[data-testid="billing-settings__invoices-loading"]').exists()).toBe(true)
  })

  test('shows the empty state when no invoices are returned', async () => {
    queryState.data = { invoices: [] }
    const wrapper = await makeInvoicesSection()
    expect(wrapper.find('[data-testid="billing-settings__invoices-empty"]').exists()).toBe(true)
  })

  test('renders one list item per invoice', async () => {
    queryState.data = { invoices: [invoice('inv_1'), invoice('inv_2')] }
    const wrapper = await makeInvoicesSection()
    expect(wrapper.find('[data-testid="billing-settings__invoice-inv_1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="billing-settings__invoice-inv_2"]').exists()).toBe(true)
  })

  test('formats the amount as currency and shows the invoice number', async () => {
    queryState.data = { invoices: [invoice('inv_1', { amount_paid: 1234, currency: 'usd' })] }
    const wrapper = await makeInvoicesSection()
    const row = wrapper.find('[data-testid="billing-settings__invoice-inv_1"]')
    expect(row.text()).toContain('INV-inv_1')
    expect(row.text()).toContain('12.34')
  })

  test('falls back to amount_due when amount_paid is zero (unpaid invoice)', async () => {
    queryState.data = {
      invoices: [invoice('inv_1', { amount_paid: 0, amount_due: 999, currency: 'usd' })]
    }
    const wrapper = await makeInvoicesSection()
    const row = wrapper.find('[data-testid="billing-settings__invoice-inv_1"]')
    expect(row.text()).toContain('9.99')
  })

  test('renders a link to the hosted invoice URL when present', async () => {
    queryState.data = { invoices: [invoice('inv_1')] }
    const wrapper = await makeInvoicesSection()
    const link = wrapper.find('[data-testid="billing-settings__invoice-link-inv_1"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('https://stripe/inv_1')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
  })

  test('omits the link when hosted_invoice_url is null', async () => {
    queryState.data = { invoices: [invoice('inv_1', { hosted_invoice_url: null })] }
    const wrapper = await makeInvoicesSection()
    expect(wrapper.find('[data-testid="billing-settings__invoice-link-inv_1"]').exists()).toBe(
      false
    )
  })

  test('falls back to the invoice id when number is null', async () => {
    queryState.data = { invoices: [invoice('inv_1', { number: null })] }
    const wrapper = await makeInvoicesSection()
    expect(wrapper.find('[data-testid="billing-settings__invoice-inv_1"]').text()).toContain(
      'inv_1'
    )
  })
})
