-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.invoke_lesson_process(p_lesson_id bigint) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_url         text;
  v_service_key text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'supabase_url' limit 1;

  if v_url is null then
    raise exception
      'Vault secret "supabase_url" not found. '
      'Run: SELECT vault.create_secret(''<url>'', ''supabase_url'');';
  end if;

  select decrypted_secret into v_service_key
  from vault.decrypted_secrets where name = 'service_role_key' limit 1;

  if v_service_key is null then
    raise exception
      'Vault secret "service_role_key" not found. '
      'Run: SELECT vault.create_secret(''<key>'', ''service_role_key'');';
  end if;

  -- A phase (Whisper especially) runs well past pg_net's 5s default, so raise the
  -- timeout to the phase budget. We ignore the response either way -- the worker
  -- settles the row itself -- but this stops pg_net logging spurious timeouts and
  -- lets net._http_response capture the real result for debugging.
  perform net.http_post(
    url     := v_url || '/functions/v1/transcribe-lesson',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_key,
      'Content-Type',  'application/json'
    ),
    body    := jsonb_build_object('action', 'process', 'lesson_id', p_lesson_id),
    timeout_milliseconds := 150000
  );
end;
$$;


ALTER FUNCTION public.invoke_lesson_process(p_lesson_id bigint) OWNER TO postgres;


GRANT ALL ON FUNCTION public.invoke_lesson_process(p_lesson_id bigint) TO anon;
GRANT ALL ON FUNCTION public.invoke_lesson_process(p_lesson_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.invoke_lesson_process(p_lesson_id bigint) TO service_role;

