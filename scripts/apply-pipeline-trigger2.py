import json
import urllib.request

API_URL = "https://api.supabase.com/v1/projects/lmlehskymbrqxqoepuuk/database/query"
TOKEN = "sbp_9cdb03f3d191a92ad2e62bc9151a584cbe4334a7"

def run_sql(sql, label=""):
    data = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(
        API_URL, data=data,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json; charset=utf-8"
        },
        method="POST"
    )
    try:
        resp = urllib.request.urlopen(req)
        result = resp.read().decode()
        print(f"OK [{label}]: {result}")
        return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"ERROR [{label}] {e.code}: {body}")
        return False

# Step 1: Create the trigger function
fn_sql = r"""
CREATE OR REPLACE FUNCTION public.auto_advance_pipeline_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  -- When reponse_relance_wa changes to true and contact is Nouveau lead
  -- advance to Contact WA
  IF NEW.reponse_relance_wa IS TRUE
     AND (OLD.reponse_relance_wa IS DISTINCT FROM TRUE)
     AND NEW.pipeline_status = 'Nouveau lead'
  THEN
    NEW.pipeline_status := E'Contact\u00e9 WA';
  END IF;

  -- Sync deals when pipeline_status changes
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
$fn$;
"""
run_sql(fn_sql, "create function")

# Step 2: Drop old trigger if exists
run_sql("DROP TRIGGER IF EXISTS auto_advance_pipeline_status_trigger ON public.contacts;", "drop old trigger")

# Step 3: Create trigger
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

# Step 4: Drop temp helper
run_sql("DROP FUNCTION IF EXISTS public.exec_admin_sql(text);", "cleanup helper")

# Step 5: Verify
run_sql("SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'contacts'", "verify triggers")
