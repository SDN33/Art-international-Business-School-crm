-- Auto-advance pipeline_status when bot fields change on contacts
-- Also syncs the corresponding deal stage

CREATE OR REPLACE FUNCTION public.auto_advance_pipeline_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When reponse_relance_wa changes to true and contact is "Nouveau lead"
  -- → advance to "Contacté WA"
  IF NEW.reponse_relance_wa IS TRUE
     AND (OLD.reponse_relance_wa IS DISTINCT FROM TRUE)
     AND NEW.pipeline_status = 'Nouveau lead'
  THEN
    NEW.pipeline_status := 'Contacté WA';
  END IF;

  -- Sync the corresponding deal stage when pipeline_status changed
  IF NEW.pipeline_status IS DISTINCT FROM OLD.pipeline_status THEN
    UPDATE public.deals
    SET stage = CASE NEW.pipeline_status
      WHEN 'Nouveau lead'    THEN 'nouveau-lead'
      WHEN 'Contacté WA'     THEN 'contacte-wa'
      WHEN 'À rappeler'      THEN 'a-rappeler'
      WHEN 'Qualifié'        THEN 'qualifie'
      WHEN 'Qualifié AFDAS'  THEN 'qualifie-afdas'
      WHEN 'Inscrit'         THEN 'inscrit'
      WHEN 'Converti'        THEN 'converti'
      WHEN 'Perdu'           THEN 'perdu'
      ELSE lower(regexp_replace(NEW.pipeline_status, '[^a-zA-Z0-9]+', '-', 'g'))
    END
    WHERE NEW.id = ANY(contact_ids);
  END IF;

  RETURN NEW;
END;
$$;

-- Fire BEFORE update so we can modify NEW.pipeline_status
-- and before the existing updated_at trigger
CREATE TRIGGER auto_advance_pipeline_status_trigger
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  WHEN (
    OLD.reponse_relance_wa IS DISTINCT FROM NEW.reponse_relance_wa
    OR OLD.pipeline_status IS DISTINCT FROM NEW.pipeline_status
  )
  EXECUTE FUNCTION public.auto_advance_pipeline_status();
