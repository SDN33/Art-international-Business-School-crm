-- Create exec_sql function for AI assistant full database access
-- This function executes arbitrary SQL and returns results as JSONB.
-- Only callable by service_role (used by the ai-assistant edge function).

CREATE OR REPLACE FUNCTION public.exec_sql(query_text TEXT)
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  result JSONB;
  row_count INTEGER;
BEGIN
  -- Try SELECT-wrapper first: works for SELECT and DML...RETURNING
  BEGIN
    EXECUTE format(
      'SELECT COALESCE(json_agg(t), ''[]''::json)::jsonb FROM (%s) t',
      query_text
    ) INTO result;
    RETURN result;
  EXCEPTION WHEN others THEN
    -- For DML without RETURNING clause
    EXECUTE query_text;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    RETURN jsonb_build_object('rows_affected', row_count, 'success', true);
  END;
END;
$$;

-- Only service_role may call this (edge function uses service role key)
REVOKE ALL ON FUNCTION public.exec_sql(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO service_role;
