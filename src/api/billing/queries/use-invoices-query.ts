import { useQuery } from '@pinia/colada'
import { listInvoices } from '../db'

/** The member's recent bills. Each one links out to its full invoice and receipt. */
export function useInvoicesQuery(limit = 20) {
  return useQuery({
    key: () => ['billing', 'invoices', limit],
    query: () => listInvoices(limit)
  })
}
