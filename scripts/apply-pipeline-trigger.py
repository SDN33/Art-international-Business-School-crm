import json
import urllib.request

API_URL = "https://api.supabase.com/v1/projects/lmlehskymbrqxqoepuuk/database/query"
TOKEN = "sbp_9cdb03f3d191a92ad2e62bc9151a584cbe4334a7"

def run_sql(sql, label=""):
    data = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(
        API_URL, data=data,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    try:
        resp = urllib.request.urlopen(req)
        result = resp.read().decode()
        print(f"OK [{label}]: {result}")
        return True
    except urllib.error.HTTPError as e:
        print(f"ERROR [{label}] {e.code}: {e.read().decode()}")
        return False

# Step 1: Create the function
fn_sql = """
CREATE OR REPLACE FUNCTION public.auto_advance_pipeline_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF NEW.reponse_relance_wa IS TRUE
     AND (OLD.reponse_relance_wa IS DISTINCT FROM TRUE)
     AND NEW.pipeline_status = 'Nouveau lead'
  THEN
    NEW.pipeline_status := E'Contact\\u00e9 WA';
  END IF;

  IF NEW.pipeline_status IS DISTINCT FROM OLD.pipeline_status THEN
    UPDATE public.deals
    SET stage = CASE NEW.pipeline_status
      WHEN 'Nouveau lead'        THEN 'nouveau-lead'
      WHEN E'Contact\\u00e9 WA'  THEN 'contacte-wa'
      WHEN E'\\u00c0 rappeler'   THEN 'a-rappeler'
      WHEN E'Qualifi\\u00e9'     THEN 'qualifie'
      WHEN E'Qualifi\\u00e9 AFDAS' THEN 'qualifie-afdas'
      WHEN 'Inscrit'             THEN 'inscrit'
      WHEN 'Converti'            THEN 'converti'
      WHEN 'Perdu'               THEN 'perdu'
      ELSE lower(regexp_replace(NEW.pipeline_status, '[^a-zA-Z0-9]+', '-', 'g'))
    END
    WHERE NEW.id = ANY(contact_ids);
  END IF;

  RETURN NEW;
END;
$fn$;
"""
run_sql(fn_sql, "create function")

# Step 2: Drop existing trigger if any
run_sql("DROP TRIGGER IF EXISTS auto_advance_pipeline_status_trigger ON public.contacts;", "drop trigger")

# Step 3: Create the trigger
trigger_sql = """
CREATE TRIGGER auto_advance_pipeline_status_trigger
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  WHEN (
    OLD.reponse_relance_wa IS DISTINCT FROM NEW.reponse_relance_wa
    OR OLD.pipeline_status IS DISTINCT FROM NEW.pipeline_status
  )
  EXECUTE FUNCTION public.auto_advance_pipeline_status();
"""
run_sql(trigger_sql, "create trigger")

# Step 4: Verify
run_sql("SELECT trigger_name, event_manipulation, action_timing FROM information_schema.triggers WHERE trigger_name = 'auto_advance_pipeline_status_trigger';", "verify")
