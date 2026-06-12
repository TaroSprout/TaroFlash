import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { signInAsTestUser, adminClient } from '../setup.js'
import {
  fetchMemberLessonCollections,
  fetchLessonCollection,
  createLessonCollection,
  setCollectionProgress,
  deleteLessonCollection
} from '@/api/lessons/db/collections'

let session

beforeEach(async () => {
  session = await signInAsTestUser()
})

afterEach(async () => {
  await session?.cleanup()
  session = null
})

// Helper: create a lesson collection using the authenticated user client so the
// set_member_id trigger picks up auth.uid() correctly.
async function createCollectionDirect(client, overrides = {}) {
  const { data, error } = await client
    .from('lesson_collections')
    .insert({ title: 'Contract Test Collection', ...overrides })
    .select()
    .single()
  if (error) throw error
  return data
}

// Helper: create a lesson via the authenticated user client. The set_member_id trigger
// stamps member_id from auth.uid(). audio_path and position are required by the schema.
async function createLessonDirect(client, collectionId, overrides = {}) {
  const { data, error } = await client
    .from('lessons')
    .insert({
      collection_id: collectionId,
      title: 'Contract Lesson',
      audio_path: 'contract-test/placeholder.mp3',
      position: 1,
      ...overrides
    })
    .select()
    .single()
  if (error) throw error
  return data
}

describe('fetchMemberLessonCollections (contract)', () => {
  test('returns an array for a member with no collections', async () => {
    const result = await fetchMemberLessonCollections()
    expect(Array.isArray(result)).toBe(true)
  })

  test('includes collections owned by the member', async () => {
    await createCollectionDirect(session.client, { title: 'My Book' })
    const result = await fetchMemberLessonCollections()
    expect(result.some((c) => c.title === 'My Book')).toBe(true)
  })

  test("returns only the current member's own collections (not other members)", async () => {
    // Create two collections for this member to confirm the filter works correctly.
    await createCollectionDirect(session.client, { title: 'My First Book' })
    await createCollectionDirect(session.client, { title: 'My Second Book' })

    const result = await fetchMemberLessonCollections()

    // All returned rows must belong to the session user.
    expect(result.every((c) => c.member_id === session.userId)).toBe(true)
  })

  test('returned rows include id, title, and lesson_count fields', async () => {
    await createCollectionDirect(session.client, { title: 'Shape Check' })
    const result = await fetchMemberLessonCollections()
    const row = result.find((c) => c.title === 'Shape Check')
    expect(row).toBeDefined()
    expect(typeof row.id).toBe('number')
    expect(typeof row.title).toBe('string')
    expect(typeof row.lesson_count).toBe('number')
  })
})

describe('fetchLessonCollection (contract)', () => {
  test('returns the collection by id', async () => {
    const created = await createCollectionDirect(session.client, { title: 'Fetch Me' })
    const result = await fetchLessonCollection(created.id)
    expect(result.id).toBe(created.id)
    expect(result.title).toBe('Fetch Me')
  })

  test('throws on a non-existent id', async () => {
    await expect(fetchLessonCollection(999999999)).rejects.toBeDefined()
  })
})

describe('createLessonCollection (contract)', () => {
  test('creates a collection owned by the caller and returns it', async () => {
    const result = await createLessonCollection('New Collection')
    expect(typeof result.id).toBe('number')
    expect(result.title).toBe('New Collection')
  })
})

describe('setCollectionProgress (contract)', () => {
  test('writes last_lesson_id and last_position_seconds to the collection row [obligation]', async () => {
    const collection = await createCollectionDirect(session.client)
    const lesson = await createLessonDirect(session.client, collection.id)

    await setCollectionProgress(collection.id, lesson.id, 37)

    const { data, error } = await adminClient
      .from('lesson_collections')
      .select('last_lesson_id, last_position_seconds')
      .eq('id', collection.id)
      .single()
    if (error) throw error

    expect(data.last_lesson_id).toBe(lesson.id)
    expect(data.last_position_seconds).toBe(37)
  })

  test('defaults position_seconds to 0 when caller omits it [obligation]', async () => {
    // First set a non-zero position, then call without position_seconds to confirm it resets to 0.
    const collection = await createCollectionDirect(session.client)
    const lesson = await createLessonDirect(session.client, collection.id)

    // Set a non-zero value first so we can confirm the default resets it.
    await setCollectionProgress(collection.id, lesson.id, 99)
    await setCollectionProgress(collection.id, lesson.id)

    const { data, error } = await adminClient
      .from('lesson_collections')
      .select('last_position_seconds')
      .eq('id', collection.id)
      .single()
    if (error) throw error

    expect(data.last_position_seconds).toBe(0)
  })

  test('updating a non-existent collection id silently affects 0 rows (RLS boundary)', async () => {
    // A non-existent collection id either belongs to another member (blocked by RLS)
    // or does not exist — either way setCollectionProgress must not throw.
    await expect(setCollectionProgress(999999999, 999999999, 50)).resolves.toBeUndefined()
  })
})

describe('deleteLessonCollection (contract)', () => {
  test('removes the collection row', async () => {
    const collection = await createCollectionDirect(session.client)

    await deleteLessonCollection(collection.id)

    const { data } = await adminClient
      .from('lesson_collections')
      .select('id')
      .eq('id', collection.id)
      .single()

    expect(data).toBeNull()
  })
})
