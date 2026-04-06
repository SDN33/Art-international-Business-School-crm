-- Auto-create a deal whenever a new contact is inserted
-- so every lead appears on the Kanban pipeline.

CREATE OR REPLACE FUNCTION public.auto_create_deal_on_contact()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  deal_stage text;
  deal_name text;
BEGIN
  -- Map pipeline_status (French label) → deal stage (slug)
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
    name,
    contact_ids,
    stage,
    formation_souhaitee,
    sales_id,
    index,
    created_at,
    updated_at
  ) VALUES (
    deal_name,
    ARRAY[NEW.id],
    deal_stage,
    NEW.formation_souhaitee,
    NEW.sales_id,
    0,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$;

-- Trigger fires AFTER INSERT so NEW.id and NEW.sales_id are populated
CREATE TRIGGER auto_create_deal_on_contact_trigger
  AFTER INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_deal_on_contact();

-- Backfill: create deals for all existing contacts that have no deal
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
