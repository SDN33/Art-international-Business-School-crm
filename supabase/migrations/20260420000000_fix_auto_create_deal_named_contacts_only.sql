-- Fix: auto_create_deal_on_contact was creating "Lead #XXXX" cards for
-- contacts inserted without first_name/last_name (e.g. contacts inserted
-- by the bot before profile data is populated).
--
-- New behaviour:
--  • INSERT: skip deal creation when both first_name and last_name are NULL/empty.
--  • UPDATE: create a deal when the contact now has a name but had none before
--            AND no deal already exists for this contact.
--
-- This prevents the "Contacté WA" column from filling up with blank cards.

-- 1. Update the function so INSERT only creates a deal when the contact has a name.

CREATE OR REPLACE FUNCTION public.auto_create_deal_on_contact()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  deal_stage text;
  deal_name  text;
BEGIN
  -- Build the candidate name.
  deal_name := TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));

  -- Skip deal creation if the contact has no name yet.
  -- The UPDATE branch below will catch it once the name is filled in.
  IF deal_name = '' THEN
    RETURN NEW;
  END IF;

  -- Skip if a deal already references this contact (idempotency).
  IF EXISTS (
    SELECT 1 FROM public.deals WHERE NEW.id = ANY(contact_ids)
  ) THEN
    RETURN NEW;
  END IF;

  deal_stage := CASE NEW.pipeline_status
    WHEN 'Nouveau lead'   THEN 'nouveau-lead'
    WHEN 'Contacté WA'    THEN 'contacte-wa'
    WHEN 'À rappeler'     THEN 'a-rappeler'
    WHEN 'Qualifié'       THEN 'qualifie'
    WHEN 'Qualifié AFDAS' THEN 'qualifie-afdas'
    WHEN 'Inscrit'        THEN 'inscrit'
    WHEN 'Converti'       THEN 'converti'
    WHEN 'Perdu'          THEN 'perdu'
    ELSE 'nouveau-lead'
  END;

  INSERT INTO public.deals (
    name, contact_ids, stage, formation_souhaitee, sales_id, index, created_at, updated_at
  ) VALUES (
    deal_name, ARRAY[NEW.id], deal_stage, NEW.formation_souhaitee, NEW.sales_id, 0, NOW(), NOW()
  );

  RETURN NEW;
END;
$$;

-- 2. Add an UPDATE branch: when a contact gains a name for the first time
--    and still has no deal, create the deal now.

CREATE OR REPLACE FUNCTION public.auto_create_deal_on_contact_update()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  old_name   text;
  new_name   text;
  deal_stage text;
BEGIN
  old_name := TRIM(COALESCE(OLD.first_name, '') || ' ' || COALESCE(OLD.last_name, ''));
  new_name := TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));

  -- Only act when the contact just gained a name (was blank before).
  IF old_name <> '' OR new_name = '' THEN
    RETURN NEW;
  END IF;

  -- Only act if this contact has no deal yet.
  IF EXISTS (
    SELECT 1 FROM public.deals WHERE NEW.id = ANY(contact_ids)
  ) THEN
    RETURN NEW;
  END IF;

  deal_stage := CASE NEW.pipeline_status
    WHEN 'Nouveau lead'   THEN 'nouveau-lead'
    WHEN 'Contacté WA'    THEN 'contacte-wa'
    WHEN 'À rappeler'     THEN 'a-rappeler'
    WHEN 'Qualifié'       THEN 'qualifie'
    WHEN 'Qualifié AFDAS' THEN 'qualifie-afdas'
    WHEN 'Inscrit'        THEN 'inscrit'
    WHEN 'Converti'       THEN 'converti'
    WHEN 'Perdu'          THEN 'perdu'
    ELSE 'nouveau-lead'
  END;

  INSERT INTO public.deals (
    name, contact_ids, stage, formation_souhaitee, sales_id, index, created_at, updated_at
  ) VALUES (
    new_name, ARRAY[NEW.id], deal_stage, NEW.formation_souhaitee, NEW.sales_id, 0, NOW(), NOW()
  );

  RETURN NEW;
END;
$$;

-- 3. Create the UPDATE trigger.

DROP TRIGGER IF EXISTS auto_create_deal_on_contact_update_trigger ON public.contacts;

CREATE TRIGGER auto_create_deal_on_contact_update_trigger
  AFTER UPDATE OF first_name, last_name ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_deal_on_contact_update();

-- 4. Clean up orphaned "Lead #XXXX" deals.
--    Deletes deals where:
--    (a) the linked contact no longer exists, OR
--    (b) the linked contact has no first/last name.

DELETE FROM public.deals
WHERE name ~ '^Lead #[0-9]+$'
  AND (
    NOT EXISTS (
      SELECT 1 FROM public.contacts c WHERE c.id = ANY(contact_ids)
    )
    OR EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = ANY(contact_ids)
        AND TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) = ''
    )
  );
