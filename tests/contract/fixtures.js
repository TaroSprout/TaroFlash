import { adminClient } from './setup.js'

export async function createDeck(client, member_id, overrides = {}) {
  const { data, error } = await client
    .from('decks')
    .insert({ title: 'Fixture Deck', member_id, ...overrides })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function insertCardDirect(client, deck_id, overrides = {}) {
  const { data, error } = await client
    .from('cards')
    .insert({
      deck_id,
      front_text: 'Q',
      back_text: 'A',
      rank: Math.floor(Math.random() * 1_000_000),
      ...overrides
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setMemberDisplayName(client, member_id, suffix) {
  const display_name = `Tester ${member_id.slice(0, 4)}${suffix ? `-${suffix}` : ''}`
  const { error } = await client.from('members').update({ display_name }).eq('id', member_id)
  if (error) throw error
  return display_name
}

// Set a member's plan via the service-role client (bypasses the self-update RLS
// lock that blocks members from changing their own plan). Card-image media
// INSERT requires plan='paid'.
export async function setMemberPlan(member_id, plan) {
  const { error } = await adminClient.from('members').update({ plan }).eq('id', member_id)
  if (error) throw error
}

export async function seedShopItem(overrides = {}) {
  const { data, error } = await adminClient
    .from('shop_items')
    .insert({ name: 'Fixture Item', price: 100, category: 'power_ups', ...overrides })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteShopItem(id) {
  await adminClient.from('shop_items').delete().eq('id', id)
}

export function makeImageFile(name = 'test.png') {
  // 1x1 transparent PNG
  const bytes = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82
  ])
  return new File([bytes], name, { type: 'image/png' })
}
