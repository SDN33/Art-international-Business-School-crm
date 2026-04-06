#!/usr/bin/env bash
# Deploy auto_create_deal_on_contact trigger and backfill existing contacts
set -euo pipefail

SUPABASE_ACCESS_TOKEN="sbp_9cdb03f3d191a92ad2e62bc9151a584cbe4334a7"
PROJECT_REF="lmlehskymbrqxqoepuuk"
API="https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query"

run_sql() {
  local sql="$1"
  local description="$2"
  echo "→ ${description}..."
  local response
  response=$(curl -sS -w "\n%{http_code}" -X POST "${API}" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg q "$sql" '{query: $q}')")
  local http_code
  http_code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | sed '$d')
  if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
    echo "   ✅ OK (HTTP ${http_code})"
    # Show row count if available
    echo "$body" | jq -r '.[] | length // empty' 2>/dev/null || true
  else
    echo "   ❌ FAILED (HTTP ${http_code})"
    echo "$body"
    exit 1
  fi
}

echo "=== Deploying auto_create_deal_on_contact ==="

# 1. Create the function
run_sql "
CREATE OR REPLACE FUNCTION public.auto_create_deal_on_contact()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS \$\$
DECLARE
  deal_stage text;
  deal_name text;
BEGIN
  deal_stage := CASE NEW.pipeline_status
    WHEN 'Nouveau lead'    THEN 'nouveau-lead'
    WHEN 'Contacté WA'     THEN 'contacte-wa'
    WHEN 'À rappeler'      THEN 'a-rappeler'
    WHEN 'Qualifié'        THEN 'qualifie'
    WHEN 'Qualifié AFDAS'  THEN 'qualifie-afdas'
    WHEN 'Inscrit'         THEN 'inscrit'
    WHEN 'Converti'        THEN 'converti'
    WHEN 'Perdu'           THEN 'perdu'
    ELSE 'nouveau-lead'
  END;

  deal_name := TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
  IF deal_name = '' THEN
    deal_name := 'Lead #' || NEW.id::text;
  END IF;

  INSERT INTO public.deals (
    name, contact_ids, stage, formation_souhaitee, sales_id, index, created_at, updated_at
  ) VALUES (
    deal_name, ARRAY[NEW.id], deal_stage, NEW.formation_souhaitee, NEW.sales_id, 0, NOW(), NOW()
  );

  RETURN NEW;
END;
\$\$;
" "Creating function auto_create_deal_on_contact"

# 2. Create the trigger
run_sql "
DROP TRIGGER IF EXISTS auto_create_deal_on_contact_trigger ON public.contacts;
CREATE TRIGGER auto_create_deal_on_contact_trigger
  AFTER INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_deal_on_contact();
" "Creating trigger on contacts"

# 3. Count contacts without deals (before backfill)
run_sql "
SELECT count(*) as contacts_without_deals
FROM public.contacts c
WHERE NOT EXISTS (
  SELECT 1 FROM public.deals d WHERE c.id = ANY(d.contact_ids)
);
" "Counting contacts without deals"

# 4. Backfill: create deals for existing contacts without a deal
run_sql "
INSERT INTO public.deals (name, contact_ids, stage, formation_souhaitee, sales_id, index, created_at, updated_at)
SELECT
  TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')),
  ARRAY[c.id],
  CASE c.pipeline_status
    WHEN 'Nouveau lead'    THEN 'nouveau-lead'
    WHEN 'Contacté WA'     THEN 'contacte-wa'
    WHEN 'À rappeler'      THEN 'a-rappeler'
    WHEN 'Qualifié'        THEN 'qualifie'
    WHEN 'Qualifié AFDAS'  THEN 'qualifie-afdas'
    WHEN 'Inscrit'         THEN 'inscrit'
    WHEN 'Converti'        THEN 'converti'
    WHEN 'Perdu'           THEN 'perdu'
    ELSE 'nouveau-lead'
  END,
  c.formation_souhaitee,
  c.sales_id,
  0,
  NOW(),
  NOW()
FROM public.contacts c
WHERE NOT EXISTS (
  SELECT 1 FROM public.deals d WHERE c.id = ANY(d.contact_ids)
);
" "Backfilling deals for existing contacts"

# 5. Verify: count total deals now
run_sql "
SELECT count(*) as total_deals FROM public.deals;
" "Counting total deals after backfill"

echo ""
echo "=== Done! All contacts now have deals on the pipeline ==="
