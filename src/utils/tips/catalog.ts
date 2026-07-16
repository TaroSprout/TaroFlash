export type TipCategory = 'shortcuts'

export type Tip = {
  id: string
  category: TipCategory
  title_key: string
  body_key: string
}

/**
 * Single source of truth for tip content. The dashboard rotates through these;
 * a future standalone tips app will browse/filter the same list by `category`.
 */
export const TIPS: Tip[] = [
  {
    id: 'shortcuts-overview',
    category: 'shortcuts',
    title_key: 'tips.shortcuts-overview.title',
    body_key: 'tips.shortcuts-overview.body'
  }
]
