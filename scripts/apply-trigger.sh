#!/bin/bash
API_URL="https://api.supabase.com/v1/projects/lmlehskymbrqxqoepuuk/database/query"
TOKEN="sbp_9cdb03f3d191a92ad2e62bc9151a584cbe4334a7"

run_sql() {
  local label="$1"
  local sql="$2"
  local body
  body=$(printf '%s' "$sql" | python3 -c 'import sys,json; print(json.dumps({"query": sys.stdin.read()}))')
  local result
  result=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$body" 2>&1)
  local http_code=$(echo "$result" | tail -1)
  local response=$(echo "$result" | sed '$d')
  if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
    echo "OK [$label]: $response"
  else
    echo "ERROR [$label] HTTP $http_code: $response"
  fi
}

echo "=== Step 1: Create function ==="
run_sql "create function" "
CREATE OR REPLACE FUNCTION public.auto_advance_pipeline_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS \$fn\$
BEGIN
  IF NEW.reponse_relance_wa IS TRUE
     AND (OLD.reponse_relance_wa IS DISTINCT FROM TRUE)
     AND NEW.pipeline_status = 'Nouveau lead'
  THEN
    NEW.pipeline_status := E'Contact\u00e9 WA';
  END IF;

  IF NEW.pipeline_status IS DISTINCT FROM OLD.pipeline_status THEN
    UPDATE public.deals
    SET stage = CASE NEW.pipeline_status
      WHEN 'Nouveau lead'             THEN 'nouveau-lead'
      WHEN E'Contact\u00e9 WA'        THEN 'contacte-wa'
      WHEN E'\u00c0 rappeler'         THEN 'a-rappeler'
      WHEN E'Qualifi\u00e9'           THEN 'qualifie'
      WHEN E'Qualifi\u00e9 AFDAS'     THEN 'qualifie-afdas'
      WHEN 'Inscrit'                  THEN 'inscrit'
      WHEN 'Converti'                 THEN 'converti'
      WHEN 'Perdu'                    THEN 'perdu'
      ELSE lower(regexp_replace(NEW.pipeline_status, '[^a-zA-Z0-9]+', '-', 'g'))
    END
    WHERE NEW.id = ANY(contact_ids);
  END IF;

  RETURN NEW;
END;
\$fn\$;
"

echo ""
echo "=== Step 2: Create trigger ==="
run_sql "create trigger" "
CREATE TRIGGER auto_advance_pipeline_status_trigger
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  WHEN (
    OLD.reponse_relance_wa IS DISTINCT FROM NEW.reponse_relance_wa
    OR OLD.pipeline_status IS DISTINCT FROM NEW.pipeline_status
  )
  EXECUTE FUNCTION public.auto_advance_pipeline_status();
"

echo ""
echo "=== Step 3: Verify ==="
run_sql "verify" "SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'contacts'"
