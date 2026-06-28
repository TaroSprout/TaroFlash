// transcribe-lesson: kick off (or retry) async transcription, and run one phase
// of it when the DB chain asks.
//
// Member-initiated (admin-gated, caller's JWT):
//   { action: 'start',  collection_id, title, audio_path, script?, lang? }
//   { action: 'retry',  lesson_id }
//     → 202 { lesson }. The row is created/reset to `processing`; the DB chain
//       trigger then drives transcription phase by phase. The FE polls the row.
//
// Internal (service-role only, invoked by the chain trigger via pg_net):
//   { action: 'process', lesson_id }
//     → 200 { ok }. Runs the single phase the row is on and returns. Advancing
//       the phase fires the next 'process'; settling ends the chain.
//
// The OpenAI/Anthropic keys never reach the client.

import { cors, requireAdmin } from '../_shared/require-admin.ts'
import { isTargetScript } from '../_shared/transcription/script.ts'
import { processLessonPhase, serviceClient } from './worker.ts'
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: cors })
  }

  const body = await req.json().catch(() => ({}))

  // 'process' is the internal step-runner: it authenticates by the service-role
  // key the chain trigger sends, NOT by a member JWT, so it's handled before the
  // admin gate that 'start'/'retry' go through.
  if (body?.action === 'process') return handleProcess(req, body)

  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  if (body?.action === 'start') return handleStart(body, auth.userClient)
  if (body?.action === 'retry') return handleRetry(body, auth.admin, auth.userClient)
  return jsonError('bad_request', 400)
})

async function handleStart(
  body: Record<string, unknown>,
  userClient: SupabaseClient
): Promise<Response> {
  const { collection_id, title, audio_path } = body
  if (!collection_id || !title || !audio_path) return jsonError('missing_fields', 400)

  const script = isTargetScript(body.script) ? body.script : 'original'
  // The chunk manifest is built client-side (ffmpeg.wasm). An empty/absent one
  // means a short file: create_pending_lesson synthesises a single chunk pointing
  // at audio_path, so the worker's loop is uniform either way.
  const chunks = Array.isArray(body.chunks) ? body.chunks : []

  // Create the pending row under the caller's JWT so RLS applies and the
  // set_member_id trigger stamps member_id. The INSERT (status='processing',
  // phase='transcribing') fires the chain trigger — the first 'process' call —
  // so there's nothing to background here; we just return the row.
  const { data: lesson, error } = await userClient
    .rpc('create_pending_lesson', {
      p_collection_id: collection_id,
      p_title: title,
      p_audio_path: audio_path,
      p_script: script,
      p_lang: body.lang ?? null,
      p_chunks: chunks
    })
    .single<{ id: number }>()

  if (error || !lesson) {
    console.error('create_pending_lesson failed', error?.message)
    return jsonError('create_failed', 400)
  }

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
    .select('id')
    .eq('id', lesson_id)
    .single<{ id: number }>()

  if (error || !lesson) return jsonError('not_found', 404)

  // Reset to the start of the chain; the UPDATE re-fires the chain trigger. The
  // audio + script are still on the row, so the worker reloads everything.
  const reset = { status: 'processing', phase: 'transcribing', error_code: null }
  const { error: updateError } = await admin
    .from('lessons')
    .update({ ...reset, updated_at: new Date().toISOString() })
    .eq('id', lesson.id)

  if (updateError) {
    console.error('retry reset failed', updateError.message)
    return jsonError('retry_failed', 400)
  }

  return accepted({ ...lesson, ...reset })
}

// Internal: run one phase. Authenticated by the service-role key (the chain
// trigger sends it; verify_jwt at the gateway only proves it's a valid project
// token, so we also check it IS the service key — a member token must not reach
// here). Always 200 once authorized: processLessonPhase settles the row itself,
// so the chain never retries on our response.
async function handleProcess(req: Request, body: Record<string, unknown>): Promise<Response> {
  const expected = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!expected || req.headers.get('Authorization') !== `Bearer ${expected}`) {
    return new Response('Forbidden', { status: 403, headers: cors })
  }

  const lessonId = Number(body.lesson_id)
  if (!Number.isFinite(lessonId)) return jsonError('missing_fields', 400)

  await processLessonPhase(serviceClient(), lessonId)

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' }
  })
}
