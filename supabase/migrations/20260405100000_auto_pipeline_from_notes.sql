-- Auto-advance pipeline_status based on note content added to a contact
-- Analyzes keywords in contact_notes to detect qualification changes

CREATE OR REPLACE FUNCTION public.auto_pipeline_from_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  note_lower text;
  current_status text;
  target_status text := NULL;
  current_rank int;
  target_rank int;
  -- Pipeline order (higher = more advanced)
  -- "Perdu" is special: always allowed regardless of rank
BEGIN
  -- Only process if note has text
  IF NEW.text IS NULL OR NEW.text = '' THEN
    RETURN NEW;
  END IF;

  note_lower := lower(NEW.text);

  -- Get current pipeline_status
  SELECT pipeline_status INTO current_status
  FROM public.contacts
  WHERE id = NEW.contact_id;

  -- Detect target status from note keywords (most specific first)
  -- Priority: Perdu > Converti > Inscrit > Qualifié AFDAS > Qualifié > À rappeler
  IF note_lower ~ '(refus|pas int.ress|ne r.pond plus|conversation termin|pas disponible|ne souhaite|d.clin|annul|faux num)' THEN
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

  -- Nothing detected
  IF target_status IS NULL THEN
    RETURN NEW;
  END IF;

  -- Same status, skip
  IF current_status = target_status THEN
    RETURN NEW;
  END IF;

  -- Rank lookup for advancement check
  current_rank := CASE current_status
    WHEN 'Nouveau lead'           THEN 1
    WHEN E'Contact\u00e9 WA'      THEN 2
    WHEN E'\u00c0 rappeler'       THEN 3
    WHEN E'Qualifi\u00e9'         THEN 4
    WHEN E'Qualifi\u00e9 AFDAS'   THEN 5
    WHEN 'Inscrit'                THEN 6
    WHEN 'Converti'               THEN 7
    WHEN 'Perdu'                  THEN 0
    ELSE 0
  END;

  target_rank := CASE target_status
    WHEN 'Nouveau lead'           THEN 1
    WHEN E'Contact\u00e9 WA'      THEN 2
    WHEN E'\u00c0 rappeler'       THEN 3
    WHEN E'Qualifi\u00e9'         THEN 4
    WHEN E'Qualifi\u00e9 AFDAS'   THEN 5
    WHEN 'Inscrit'                THEN 6
    WHEN 'Converti'               THEN 7
    WHEN 'Perdu'                  THEN 99
    ELSE 0
  END;

  -- Only advance (higher rank) or go to Perdu
  -- Never go backwards in the pipeline
  IF target_rank <= current_rank THEN
    RETURN NEW;
  END IF;

  -- Update the contact pipeline_status
  -- The existing auto_advance_pipeline_status_trigger on contacts
  -- will handle syncing the deal stage
  UPDATE public.contacts
  SET pipeline_status = target_status
  WHERE id = NEW.contact_id;

  RETURN NEW;
END;
$fn$;

-- Fire AFTER INSERT on contact_notes (after note is saved)
CREATE TRIGGER auto_pipeline_from_note_trigger
  AFTER INSERT ON public.contact_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_pipeline_from_note();
