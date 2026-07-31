set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.invoke_purge_accounts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_url         text;
  v_service_key text;
BEGIN
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url'
  LIMIT 1;

  IF v_url IS NULL THEN
    RAISE EXCEPTION
      'Vault secret "supabase_url" not found. '
      'Run: SELECT vault.create_secret(''<url>'', ''supabase_url'');';
  END IF;

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF v_service_key IS NULL THEN
    RAISE EXCEPTION
      'Vault secret "service_role_key" not found. '
      'Run: SELECT vault.create_secret(''<key>'', ''service_role_key'');';
  END IF;

  PERFORM net.http_post(
    url     := v_url || '/functions/v1/purge-accounts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_key,
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
END;
$function$
;


