#!/usr/bin/env python3
"""
Backfill : copie les anciennes notes [BOT] de contact_notes → interactions (type WhatsApp)

Pour chaque note commençant par "[BOT]" dans contact_notes, crée une interaction
de type "WhatsApp" si aucune interaction identique n'existe déjà pour ce contact
à la même date (évite les doublons).

Usage: python3 scripts/backfill_bot_notes_to_interactions.py
"""

import urllib.request
import urllib.error
import json
import datetime
import sys
import os


def _load_env_file(path="/root/.env.aibs"):
    try:
        with open(path) as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _, _v = _line.partition("=")
                    os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))
    except FileNotFoundError:
        pass


_load_env_file()

SB_URL = "https://lmlehskymbrqxqoepuuk.supabase.co"
SB_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
if not SB_KEY:
    print("ERREUR CRITIQUE : SUPABASE_SERVICE_ROLE_KEY manquant. Ajoutez-le dans /root/.env.aibs", flush=True)
    sys.exit(1)


def sb_headers():
    return {
        "apikey": SB_KEY,
        "Authorization": f"Bearer {SB_KEY}",
        "Content-Type": "application/json",
    }


def exec_sql(query):
    data = json.dumps({"query_text": query}).encode()
    req = urllib.request.Request(
        f"{SB_URL}/rest/v1/rpc/exec_sql",
        data=data,
        headers=sb_headers(),
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())


def post_json(url, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=sb_headers(), method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def log(msg):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def main():
    log("=== Backfill notes [BOT] → interactions WhatsApp ===")

    # 1. Récupérer toutes les notes [BOT] de contact_notes
    notes = exec_sql("""
        SELECT cn.id, cn.contact_id, cn.text, cn.date,
               c.first_name, c.last_name
        FROM contact_notes cn
        JOIN contacts c ON c.id = cn.contact_id
        WHERE cn.text LIKE '[BOT]%'
        ORDER BY cn.date ASC
    """)

    log(f"Notes [BOT] trouvées : {len(notes)}")
    if not notes:
        log("Rien à faire — STOP")
        sys.exit(0)

    created = 0
    skipped = 0
    errors = 0

    for note in notes:
        contact_id = note["contact_id"]
        note_text = note["text"]
        note_date = note["date"]  # ISO string
        prenom = note.get("first_name", "")
        nom = note.get("last_name", "")

        # Extraire formation_label depuis le texte de la note
        # Format: "[BOT] Formation: X | Issue: ..."
        formation_label = "Formation AIBS"
        if "Formation: " in note_text:
            try:
                formation_label = note_text.split("Formation: ")[1].split(" | ")[0].strip()
            except Exception:
                pass

        # Construire le titre
        titre = f"Note bot — {formation_label}"

        # Vérifier si une interaction identique existe déjà (même contact, même titre, même jour)
        note_day = note_date[:10]  # "YYYY-MM-DD"
        existing = exec_sql(f"""
            SELECT id FROM interactions
            WHERE contact_id = {contact_id}
              AND type_interaction = 'WhatsApp'
              AND responsable = 'Léo (Bot AIBS)'
              AND date_heure::date = '{note_day}'::date
            LIMIT 1
        """)

        if existing:
            log(f"  SKIP  id_note={note['id']} contact={prenom} {nom} — interaction déjà présente")
            skipped += 1
            continue

        # Créer l'interaction
        body = {
            "contact_id": contact_id,
            "date_heure": note_date,
            "type_interaction": "WhatsApp",
            "titre": titre,
            "message": note_text,
            "canal": "WhatsApp",
            "statut_suivi": "Envoyé",
            "responsable": "Léo (Bot AIBS)",
        }
        status = post_json(f"{SB_URL}/rest/v1/interactions", body)

        if status in (200, 201):
            log(f"  ✅ id_note={note['id']} contact={prenom} {nom} → interaction créée ({note_day})")
            created += 1
        else:
            log(f"  ❌ id_note={note['id']} contact={prenom} {nom} — HTTP {status}")
            errors += 1

    log("=== Résumé ===")
    log(f"  Créées  : {created}")
    log(f"  Skippées: {skipped} (déjà existantes)")
    log(f"  Erreurs : {errors}")


if __name__ == "__main__":
    main()
