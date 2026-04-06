#!/bin/bash
# Deploy auto_pipeline_from_note trigger to production
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
CREATE OR REPLACE FUNCTION public.auto_pipeline_from_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS \$fn\$
DECLARE
  note_lower text;
  current_status text;
  target_status text := NULL;
  current_rank int;
  target_rank int;
BEGIN
  IF NEW.text IS NULL OR NEW.text = '' THEN
    RETURN NEW;
  END IF;

  note_lower := lower(NEW.text);

  SELECT pipeline_status INTO current_status
  FROM public.contacts
  WHERE id = NEW.contact_id;

  -- Detect target status from keywords (most specific first)
  IF note_lower ~ '(refus|pas int.ress|ne r.pond plus|conversation termin|ne souhaite|d.clin|annul|faux num)' THEN
    target_status := 'Perdu';
  ELSIF note_lower ~ '(converti|paiement|confirm. l.inscription|a pay|r.glement)' THEN
    target_status := 'Converti';
  ELSIF note_lower ~ '(inscrit|inscription confirm|rdv confirm|calendly confirm|a r.serv)' THEN
    target_status := 'Inscrit';
  ELSIF note_lower ~ '(afdas|.ligible afdas|dossier afdas|prise en charge)' THEN
    target_status := E'Qualifi\u00e9 AFDAS';
  ELSIF note_lower ~ '(qualifi.|int.ress. par|veut s.inscrire|motivation confirm|demande d.info|envoi programme|brochure envoy)' THEN
    target_status := E'Qualifi\u00e9';
  ELSIF note_lower ~ '(recontact|rappeler|relancer|pas disponible avant|demande .tre recontact|rappel plus tard|absent|messagerie)' THEN
    target_status := E'\u00c0 rappeler';
  ELSIF note_lower ~ '(contact. wa|whatsapp|bot wa|envoi wa|message wa)' THEN
    target_status := E'Contact\u00e9 WA';
  END IF;

  IF target_status IS NULL OR current_status = target_status THEN
    RETURN NEW;
  END IF;

  current_rank := CASE current_status
    WHEN 'Nouveau lead' THEN 1 WHEN E'Contact\u00e9 WA' THEN 2
    WHEN E'\u00c0 rappeler' THEN 3 WHEN E'Qualifi\u00e9' THEN 4
    WHEN E'Qualifi\u00e9 AFDAS' THEN 5 WHEN 'Inscrit' THEN 6
    WHEN 'Converti' THEN 7 WHEN 'Perdu' THEN 0 ELSE 0 END;

  target_rank := CASE target_status
    WHEN 'Nouveau lead' THEN 1 WHEN E'Contact\u00e9 WA' THEN 2
    WHEN E'\u00c0 rappeler' THEN 3 WHEN E'Qualifi\u00e9' THEN 4
    WHEN E'Qualifi\u00e9 AFDAS' THEN 5 WHEN 'Inscrit' THEN 6
    WHEN 'Converti' THEN 7 WHEN 'Perdu' THEN 99 ELSE 0 END;

  IF target_rank <= current_rank THEN
    RETURN NEW;
  END IF;

  UPDATE public.contacts
  SET pipeline_status = target_status
  WHERE id = NEW.contact_id;

  RETURN NEW;
END;
\$fn\$;
"

echo ""
echo "=== Step 2: Drop old trigger if exists ==="
run_sql "drop trigger" "DROP TRIGGER IF EXISTS auto_pipeline_from_note_trigger ON public.contact_notes;"

echo ""
echo "=== Step 3: Create trigger ==="
run_sql "create trigger" "
CREATE TRIGGER auto_pipeline_from_note_trigger
  AFTER INSERT ON public.contact_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_pipeline_from_note();
"

echo ""
echo "=== Step 4: Verify ==="
run_sql "verify" "SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_name LIKE 'auto_pipeline%'"
