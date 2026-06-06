// transcribe-lesson: kick off (or retry) async transcription of a lesson.
//
// Request:  { action: 'start',  collection_id, title, audio_path, script?, lang? }
//           { action: 'retry',  lesson_id }
// Response: 202 { lesson }  — the row is created/reset to `processing` and a
//           background worker transcribes it; the FE polls the row for the result.
//
// The OpenAI/Anthropic keys never reach the client. Admin-only: requireAdmin()
// runs before any work.

import { cors, requireAdmin } from '../_shared/require-admin.ts'
import { isTargetScript, type TargetScript } from '../_shared/transcription/script.ts'
import { runTranscription } from './worker.ts'
import { type SupabaseClient } from '@supabase/supabase-js'

function jsonError(code: string, status: number): Response {
  return new Response(JSON.stringify({ code }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  })
}

function accepted(lesson: unknown): Response {
  return new Response(JSON.stringify({ lesson }), {
    status: 202,
    headers: { ...cors, 'Content-Type': 'application/json' }
  })
}

// Supabase keeps the worker instance alive until the promise settles, so
// transcription continues after we've returned 202. Falls back to a detached
// call when the runtime global is absent (e.g. local `deno test`).
function runInBackground(promise: Promise<unknown>): void {
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } })
    .EdgeRuntime
  if (runtime?.waitUntil) runtime.waitUntil(promise)
  else void promise
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: cors })
  }

  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => ({}))

  if (body?.action === 'start') return handleStart(body, auth.admin, auth.userClient)
  if (body?.action === 'retry') return handleRetry(body, auth.admin, auth.userClient)
  return jsonError('bad_request', 400)
})

async function handleStart(
  body: Record<string, unknown>,
  admin: SupabaseClient,
  userClient: SupabaseClient
): Promise<Response> {
  const { collection_id, title, audio_path } = body
  if (!collection_id || !title || !audio_path) return jsonError('missing_fields', 400)

  const script = isTargetScript(body.script) ? body.script : 'original'

  // Create the pending row under the caller's JWT so RLS applies and the
  // set_member_id trigger stamps member_id; the worker then writes via service-role.
  const { data: lesson, error } = await userClient
    .rpc('create_pending_lesson', {
      p_collection_id: collection_id,
      p_title: title,
      p_audio_path: audio_path,
      p_script: script,
      p_lang: body.lang ?? null
    })
    .single<{ id: number; audio_path: string; script: string }>()

  if (error || !lesson) {
    console.error('create_pending_lesson failed', error?.message)
    return jsonError('create_failed', 400)
  }

  runInBackground(runTranscription(admin, { ...lesson, script: script }))
  return accepted(lesson)
}

async function handleRetry(
  body: Record<string, unknown>,
  admin: SupabaseClient,
  userClient: SupabaseClient
): Promise<Response> {
  const { lesson_id } = body
  if (!lesson_id) return jsonError('missing_fields', 400)

  // Read under the caller's JWT — RLS guarantees they can only retry their own.
  const { data: lesson, error } = await userClient
    .from('lessons')
    .select('id, audio_path, script')
    .eq('id', lesson_id)
    .single<{ id: number; audio_path: string; script: TargetScript }>()

  if (error || !lesson) return jsonError('not_found', 404)

  await admin
    .from('lessons')
    .update({ status: 'processing', phase: 'transcribing', error_code: null })
    .eq('id', lesson.id)

  runInBackground(runTranscription(admin, lesson))
  return accepted({ ...lesson, status: 'processing', phase: 'transcribing', error_code: null })
}
