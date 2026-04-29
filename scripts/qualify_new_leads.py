#!/usr/bin/env python3
"""
AIBS - Qualification bot leads (one-shot / cron)
=====================================================
Envoie un WA de qualification aux leads "Nouveau lead" avec téléphone.
Log dans `interactions` + `contact_notes`. PATCH pipeline Kanban → "Contacté WA".

Anti-spam:
  - Fenêtre horaire 9h-20h Paris
  - Warm-up jour 13+ = 30/jour max, MAX_PER_RUN leads par exécution
  - Délai aléatoire entre envois (BASE_DELAY ± 60s)
  - Jamais 2 ice breakers identiques consécutifs

Usage: python3 /root/scripts/qualify_new_leads.py
Cron suggestion: */30 9-19 * * * /usr/bin/python3 /root/scripts/qualify_new_leads.py >> /var/log/qualify-leads.log 2>&1
"""

import urllib.request
import urllib.error
import json
import datetime
import random
import sys
import time
import subprocess
import os

# ─── Config ───────────────────────────────────────────────────────────────────
SB_URL = "https://lmlehskymbrqxqoepuuk.supabase.co"
SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtbGVoc2t5bWJycXhxb2VwdXVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI1MzQzOCwiZXhwIjoyMDkwODI5NDM4fQ.0ZOZDA8mi5OasUopvXIs70x4kSv0WZUD5jLyMrqa7Os"
WA_RELAY_URL = "http://localhost:8767/send"
WA_RELAY_TOKEN = "aibs-wa-relay-xK9mP3qR"
SALES_BOT_ID = 2          # sales id pour les notes bot
MAX_PER_RUN = 6           # leads max par exécution (warm-up sécurité)
DAILY_MAX = 30            # warm-up jour 13+ = 30/jour
BASE_DELAY = 180          # secondes entre envois (3 min ± 60s)
PARIS_TZ_OFFSET = 2       # CEST UTC+2 en avril 2026

# ─── Ice breakers par formation ───────────────────────────────────────────────
ICE_BREAKERS = {
    "acteur-leader": [
        "Salut {prenom} ! 👋 Léo de AIBS. On a reçu ta demande pour Acteur Leader — Laetitia Eïdo (Netflix) et des directeurs de casting interviennent. Deux questions rapides : tu as déjà une expérience en jeu face caméra, et tu connais tes droits AFDAS si tu es intermittent(e) ?",
        "Hey {prenom} 🎬 Léo de AIBS ! Ton inscription pour Acteur Leader est bien reçue. Nos prochaines dates arrivent vite — tu es dispo sur quelle période et tu as déjà regardé le financement AFDAS ?",
        "Hello {prenom} ! Léo de AIBS ici. Acteur Leader avec Laetitia Eïdo et nos directeurs de casting, c'est LA formation pour passer un cap. Tu as combien d'années d'expérience en jeu, et tu as déjà un financement en tête ?",
        "Hey {prenom}, Léo de AIBS ici ! Super choix Acteur Leader. On travaille le self-tape pro et le jeu face caméra. Petites questions : tu cherches plutôt à te perfectionner ou à débuter, et tu as déjà fait des démarches de financement ?",
    ],
    "court-metrage": [
        "Salut {prenom} ! 🎬 Léo de AIBS. Formation Court-métrage — 9 jours pour réaliser ton propre film avec un producteur oscarisé. Tu as déjà un projet en tête et tu sais si tu es intermittent(e) et éligible AFDAS ?",
        "Hey {prenom} ! Léo de AIBS 😊 Merci pour le Court-métrage. On encadre de l'écriture au montage. Tu es plutôt réalisateur ou scénariste, et tu as déjà regardé les options de financement ?",
        "Salut {prenom} ! Léo de AIBS. Court-métrage, super projet. En 9 jours tu repars avec ton film. Tu viens du côté technique ou artistique, et tu es dispo sur quelle période ?",
        "Salut {prenom}, Léo de AIBS ici. Court-métrage avec un producteur oscarisé — 9 jours intensifs. Tu as un genre/thème en tête et tu connais ta situation côté financement ?",
    ],
    "doublage-voix": [
        "Salut {prenom} ! 🎙️ Léo de AIBS. Nos directeurs de doublage Netflix forment au doublage + home studio. Tu as déjà une expérience voix (doublage, voix off, chant) et tu connais tes droits AFDAS si tu es intermittent(e) ?",
        "Hey {prenom} ! Léo de AIBS ici 😊 Doublage & Home Studio, super choix. Tu repars avec ta voix pour ta bande démo. C'est une reconversion ou tu fais déjà de la voix, et tu as un financement en vue ?",
        "Salut {prenom} ! Léo de AIBS 🎙 Le doublage recrute énormément. Nos formateurs Netflix t'accompagnent de A à Z. Tu cherches à te lancer ou à te perfectionner, et tu es dispo sur quelle période ?",
        "Salut {prenom}, Léo de AIBS. Doublage & Home Studio — le gros plus c'est que tu repars avec ta voix pour ta bande démo. Question rapide : c'est quoi ton parcours et tu as déjà fait une demande de financement ?",
    ],
    "pro-tools-mixage": [
        "Salut {prenom} ! 🎧 Léo de AIBS. Pro Tools & Mixage — formation certifiante sur matos pro. Tu bosses déjà dans le son ou c'est nouveau, et tu as regardé le financement AFDAS ?",
        "Hey {prenom} ! Léo de AIBS ici 😊 Pro Tools, très bon choix. La certif est reconnue partout. Tu cherches la certification ou la pratique du mixage, et tu connais tes droits de financement ?",
        "Salut {prenom} ! Léo de AIBS 🎧 Excellent choix Pro Tools. La certif est reconnue internationalement. Tu bosses déjà sur un DAW et tu as un financement prévu ?",
        "Salut {prenom}, Léo de AIBS. Pro Tools — matos haut de gamme + certif reconnue. Tu as un projet audio concret et tu connais ta situation côté financement ?",
    ],
    "strategie-cannes": [
        "Salut {prenom} ! 🎬 Léo de AIBS. Networking Cannes — rencontres avec des pros du Festival. Tu as un projet à pitcher ou tu cherches des contacts, et tu bosses dans quel domaine du cinéma ?",
        "Hey {prenom} ! Léo de AIBS ici 🌟 Networking Cannes, expérience unique. Tu es dans la prod, la réal ou l'acting, et tu as un projet en cours à présenter ?",
        "Salut {prenom} ! Léo de AIBS ici. Networking Cannes, une porte d'entrée unique dans l'industrie. Tu bosses sur quoi en ce moment et qu'est-ce que tu attends de cette expérience ?",
    ],
    "default": [
        "Salut {prenom} ! 👋 Léo de AIBS ici. Merci pour ton inscription. On a des formations en acting, doublage, réalisation, son pro. Quel domaine t'intéresse et tu travailles dans le spectacle / audiovisuel ?",
        "Hey {prenom} ! Léo de AIBS ici 😊 Merci de ton intérêt. Petite question pour t'orienter vite : tu es plutôt attiré(e) par le jeu d'acteur, la technique ou la réal, et tu es intermittent(e) du spectacle (éligible AFDAS) ?",
        "Salut {prenom} ! Léo de AIBS ici. On a des formations top avec des intervenants Netflix et Cannes. Tu es attiré(e) par quoi et tu as déjà regardé les options de financement ?",
        "Salut {prenom}, Léo de AIBS ici. On a bien reçu ton inscription. Pour bien t'orienter : tu travailles déjà dans l'audiovisuel ou c'est un nouveau projet, et tu connais tes droits de financement ?",
    ],
}

FORMATION_SLUG_MAP = {
    "acteur-leader":    "Acteur Leader",
    "court-metrage":    "Court-métrage",
    "doublage-voix":    "Doublage & Home Studio",
    "pro-tools-mixage": "Pro Tools & Mixage",
    "strategie-cannes": "Networking Cannes",
}

# ─── Helpers ──────────────────────────────────────────────────────────────────
def log(msg):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)

def sb_headers():
    return {
        "apikey": SB_KEY,
        "Authorization": f"Bearer {SB_KEY}",
        "Content-Type": "application/json",
    }

def get_json(url):
    req = urllib.request.Request(url, headers=sb_headers())
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())

def post_json(url, body, method="POST", extra_headers=None):
    data = json.dumps(body).encode()
    h = {**sb_headers(), **(extra_headers or {})}
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()

def patch_contact(contact_id, fields):
    url = f"{SB_URL}/rest/v1/contacts?id=eq.{contact_id}"
    status, _ = post_json(url, fields, method="PATCH", extra_headers={"Prefer": "return=minimal"})
    return status in (200, 204)

def log_interaction(contact_id, message, formation_label):
    now_iso = datetime.datetime.now(datetime.UTC).isoformat()
    body = {
        "contact_id": contact_id,
        "date_heure": now_iso,
        "type_interaction": "Contact sortant Bot",
        "titre": f"Qualification lead WA — {formation_label or 'Formation à préciser'}",
        "message": message,
        "canal": "WhatsApp",
        "statut_suivi": "Envoyé",
        "responsable": "Léo (Bot AIBS)",
    }
    status, _ = post_json(f"{SB_URL}/rest/v1/interactions", body)
    return status in (200, 201)

def log_contact_note(contact_id, formation_label):
    body = {
        "contact_id": contact_id,
        "sales_id": SALES_BOT_ID,
        "status": "warm",
        "text": f"[BOT] Formation: {formation_label or 'À préciser'} | Issue: Contacté WA | Détails: premier contact envoyé par Léo",
        "date": datetime.datetime.now(datetime.UTC).isoformat(),
    }
    status, _ = post_json(f"{SB_URL}/rest/v1/contact_notes", body)
    return status in (200, 201)

def send_wa(phone, message):
    """Envoie via wa-relay (http://localhost:8767/send)"""
    data = json.dumps({"phone": phone, "message": message}).encode()
    req = urllib.request.Request(
        WA_RELAY_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {WA_RELAY_TOKEN}",
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            resp = json.loads(r.read())
            return True, resp
    except urllib.error.HTTPError as e:
        return False, json.loads(e.read()) if e.read() else {}
    except Exception as e:
        return False, {"error": str(e)}

def get_ice_breaker(slug, prenom, last_variant):
    """Retourne un message ice breaker aléatoire (jamais le même que last_variant)."""
    options = ICE_BREAKERS.get(slug, ICE_BREAKERS["default"])
    available = [i for i in range(len(options)) if i != last_variant]
    if not available:
        available = list(range(len(options)))
    idx = random.choice(available)
    return options[idx].format(prenom=prenom), idx

def infer_slug(formation_souhaitee):
    if not formation_souhaitee:
        return "default"
    s = formation_souhaitee.lower()
    for ch, r in [('é','e'),('è','e'),('ê','e'),('à','a'),('â','a')]:
        s = s.replace(ch, r)
    if "acteur" in s or "leader" in s or "casting" in s:
        return "acteur-leader"
    if "court" in s or "court-m" in s or "oscarise" in s or "long" in s or "ecrire" in s or "long metrage" in s:
        return "court-metrage"
    if "doublage" in s or "voix" in s or "voix-off" in s or "studio" in s:
        return "doublage-voix"
    if "pro tools" in s or "mixage" in s or "son" in s:
        return "pro-tools-mixage"
    if "cannes" in s or "festival" in s or "networking" in s or "strategie" in s:
        return "strategie-cannes"
    return "default"

def get_paris_hour():
    utc_hour = datetime.datetime.now(datetime.UTC).hour
    return (utc_hour + PARIS_TZ_OFFSET) % 24

def count_contacted_today():
    today = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d")
    url = (f"{SB_URL}/rest/v1/interactions"
           f"?type_interaction=eq.Contact%20sortant%20Bot"
           f"&canal=eq.WhatsApp"
           f"&created_at=gte.{today}T00%3A00%3A00")
    req = urllib.request.Request(url, headers={
        **sb_headers(),
        "Prefer": "count=exact",
    })
    with urllib.request.urlopen(req, timeout=20) as r:
        raw = r.headers.get("Content-Range", "*/0")
        # format: "0-N/total" or "*/total"
        try:
            return int(raw.split("/")[-1])
        except Exception:
            return 0

# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    log("=== Qualification leads AIBS — démarrage ===")

    # 1. Vérification heure Paris
    paris_hour = get_paris_hour()
    log(f"Heure Paris: {paris_hour}h")
    if paris_hour < 9 or paris_hour >= 20:
        log("Hors plage 9h-20h — STOP")
        sys.exit(0)

    # 2. Quota journalier
    already_sent = count_contacted_today()
    remaining_quota = DAILY_MAX - already_sent
    log(f"Quota jour: {already_sent}/{DAILY_MAX} envoyés — reste {remaining_quota}")
    if remaining_quota <= 0:
        log("Quota journalier atteint — STOP")
        sys.exit(0)

    to_send = min(MAX_PER_RUN, remaining_quota)

    # 3. Récupérer les nouveaux leads avec téléphone via exec_sql (filtre SQL précis sur phone_jsonb non vide)
    sql = f"""
        SELECT id, first_name, last_name, pipeline_status, phone_jsonb,
               formation_souhaitee, formation_slug, first_seen
        FROM contacts
        WHERE pipeline_status IN ('Nouveau lead', 'À évaluer')
          AND phone_jsonb IS NOT NULL
          AND phone_jsonb != '[]'::jsonb
          AND phone_jsonb->0->>'number' != ''
        ORDER BY first_seen DESC
        LIMIT {to_send * 3}
    """
    payload = json.dumps({"query_text": sql}).encode()
    req = urllib.request.Request(
        f"{SB_URL}/rest/v1/rpc/exec_sql",
        data=payload,
        headers={**sb_headers()},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        contacts = json.loads(r.read())

    contacts = contacts[:to_send]

    log(f"Leads à contacter : {len(contacts)}")
    if not contacts:
        log("Aucun lead à contacter — STOP")
        sys.exit(0)

    # 4. Envoi
    sent = 0
    errors = 0
    last_variant = -1

    for c in contacts:
        contact_id = c["id"]
        prenom = (c.get("first_name") or "").strip() or "toi"
        # Capitaliser le prénom (éviter "PRÉNOM" en majuscules)
        if prenom.isupper() or prenom.islower():
            prenom = prenom.capitalize()

        phone = c["phone_jsonb"][0]["number"]
        formation_souhaitee = c.get("formation_souhaitee") or ""
        slug = c.get("formation_slug") or infer_slug(formation_souhaitee)
        formation_label = FORMATION_SLUG_MAP.get(slug, formation_souhaitee or "Formation AIBS")
        first_seen = c.get("first_seen", "")[:10]

        # Anti-doublon : vérifier que le contact n'est PAS déjà "Contacté WA"
        check = get_json(f"{SB_URL}/rest/v1/contacts?id=eq.{contact_id}&select=pipeline_status&limit=1")
        if check and check[0].get("pipeline_status") == "Contacté WA":
            log(f"  SKIP id={contact_id} {prenom} — déjà Contacté WA")
            continue

        # Construire le message
        message, last_variant = get_ice_breaker(slug, prenom, last_variant)

        log(f"  → id={contact_id} {prenom} | formation={formation_label} | tel={phone} | depuis={first_seen}")
        log(f"    Message: {message[:80]}…")

        # PATCH pipeline_status AVANT envoi (règle SOUL.md)
        if not patch_contact(contact_id, {"pipeline_status": "Contacté WA", "last_seen": datetime.datetime.now(datetime.UTC).isoformat()}):
            log(f"    ❌ PATCH CRM échoué — STOP (sécurité)")
            errors += 1
            break

        # Envoi WA
        ok, resp = send_wa(phone, message)
        if not ok:
            log(f"    ❌ Envoi WA échoué: {resp} — STOP TOTAL (règle warm-up)")
            # Rollback pipeline_status
            patch_contact(contact_id, {"pipeline_status": "Nouveau lead"})
            errors += 1
            break

        # Log interactions
        if not log_interaction(contact_id, message, formation_label):
            log(f"    ⚠️  Log interaction échoué (non bloquant)")

        # Log contact_note
        if not log_contact_note(contact_id, formation_label):
            log(f"    ⚠️  Log note échoué (non bloquant)")

        log(f"    ✅ Envoyé + CRM mis à jour")
        sent += 1

        # Délai anti-spam (sauf dernier)
        if sent < to_send and c != contacts[-1]:
            delay = BASE_DELAY + random.randint(-60, 60)
            log(f"    ⏳ Pause {delay}s…")
            time.sleep(delay)

    log(f"=== Résumé ===")
    log(f"  Envoyés  : {sent}")
    log(f"  Erreurs  : {errors}")
    log(f"  Quota restant demain : {remaining_quota - sent}/{DAILY_MAX}")

    if errors > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
