DO $$
DECLARE
  r RECORD;
  note_lower text;
  current_status text;
  target_status text;
  current_rank int;
  target_rank int;
  updated_count int := 0;
BEGIN
  FOR r IN SELECT cn.id, cn.contact_id, cn.text FROM contact_notes cn ORDER BY cn.id
  LOOP
    IF r.text IS NULL OR r.text = '' THEN
      CONTINUE;
    END IF;

    note_lower := lower(r.text);
    target_status := NULL;

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

    IF target_status IS NULL THEN
      CONTINUE;
    END IF;

    SELECT pipeline_status INTO current_status FROM contacts WHERE id = r.contact_id;

    IF current_status = target_status THEN
      CONTINUE;
    END IF;

    current_rank := CASE current_status
      WHEN 'Nouveau lead' THEN 1
      WHEN E'Contact\u00e9 WA' THEN 2
      WHEN E'\u00c0 rappeler' THEN 3
      WHEN E'Qualifi\u00e9' THEN 4
      WHEN E'Qualifi\u00e9 AFDAS' THEN 5
      WHEN 'Inscrit' THEN 6
      WHEN 'Converti' THEN 7
      WHEN 'Perdu' THEN 0
      ELSE 0
    END;

    target_rank := CASE target_status
      WHEN 'Nouveau lead' THEN 1
      WHEN E'Contact\u00e9 WA' THEN 2
      WHEN E'\u00c0 rappeler' THEN 3
      WHEN E'Qualifi\u00e9' THEN 4
      WHEN E'Qualifi\u00e9 AFDAS' THEN 5
      WHEN 'Inscrit' THEN 6
      WHEN 'Converti' THEN 7
      WHEN 'Perdu' THEN 99
      ELSE 0
    END;

    IF target_rank > current_rank THEN
      UPDATE contacts SET pipeline_status = target_status WHERE id = r.contact_id;
      updated_count := updated_count + 1;
      RAISE NOTICE 'Contact % : % -> %', r.contact_id, current_status, target_status;
    END IF;
  END LOOP;
  RAISE NOTICE 'Total contacts updated: %', updated_count;
END $$;
