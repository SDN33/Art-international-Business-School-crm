#!/usr/bin/env python3
"""
Script de rattrapage quotidien — Meta Lead Ads → AIBS CRM (Supabase)
Importe tous les leads Meta des 48 dernières heures qui ne sont pas encore en base.
Conçu pour tourner en cron quotidien sur le VPS (ex: 06:00 chaque jour).

Cron: 0 6 * * * /usr/bin/python3 /root/scripts/meta-leads-daily-catchup.py >> /var/log/meta-leads-catchup.log 2>&1
"""

import urllib.request
import urllib.error
import json
import datetime
import re
import sys

# ─── Configuration ──────────────────────────────────────────────────────────
META_TOKEN = "EAANTSPOSqsoBRO6q9abZCk3qvzDrIs1j69mhkWnqYsnrFgsK7mo3MCGeeRuYC3XelVoOiE0XeYEQUwBZBIyxCQ10k24IZCyu6CQ5MQx7qxYVXTmSiG4ZCo2r4yY34axy7BBC7ae0ghi9c94U4XX8HTPLXTNtdh1jRHbP7KkJvSmrNzfoFBKeZCg6URlDGodPuYzAP1ghx"
PAGE_ID = "750136721524800"
SUPABASE_URL = "https://lmlehskymbrqxqoepuuk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtbGVoc2t5bWJycXhxb2VwdXVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI1MzQzOCwiZXhwIjoyMDkwODI5NDM4fQ.0ZOZDA8mi5OasUopvXIs70x4kSv0WZUD5jLyMrqa7Os"

# Fenêtre de rattrapage : 48h (couvre les pannes n8n jusqu'à 2 jours)
CATCHUP_HOURS = 48

# ─── Helpers ────────────────────────────────────────────────────────────────
def log(msg):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)

def get_json(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())

def post_json(url, body, headers=None):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers or {}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def normalize(s):
    for a, b in [('é','e'),('è','e'),('ê','e'),('à','a'),('â','a'),
                 ('î','i'),('ô','o'),('û','u'),('ç','c'),('ù','u')]:
        s = s.lower().replace(a, b)
    return re.sub(r'\s+', '_', s.strip())

def infer_formation(raw):
    if not raw:
        return None, None
    s = raw.lower()
    for a, b in [('é','e'),('è','e'),('ê','e'),('à','a'),('â','a')]:
        s = s.replace(a, b)
    if re.search(r'doublage|voix.?off', s):
        return 'doublage-voix', raw.strip()
    if re.search(r'court.?m[ee]trage|oscarise', s):
        return 'court-metrage', raw.strip()
    if re.search(r'pro.?tools|mixage', s):
        return 'pro-tools-mixage', raw.strip()
    if re.search(r'cannes', s):
        return 'strategie-cannes', raw.strip()
    if re.search(r'acteur|leader|casting', s):
        return 'acteur-leader', raw.strip()
    return None, raw.strip()

def map_lead(lead, form_name=""):
    fields = {}
    for f in lead.get("field_data", []):
        key = normalize(f.get("name", ""))
        val = f.get("values", [""])[0] if f.get("values") else ""
        fields[key] = val
        fields[f.get("name", "")] = val

    full_name = fields.get("full_name") or fields.get("nom_complet") or fields.get("name") or ""
    split_first, split_last = "", ""
    if full_name:
        parts = full_name.strip().split()
        split_first = parts[0] if parts else ""
        split_last = " ".join(parts[1:]) if len(parts) > 1 else (parts[0] if parts else "")

    first = lead.get("first_name") or fields.get("first_name") or fields.get("prenom") or split_first or "Inconnu"
    last  = lead.get("last_name")  or fields.get("last_name")  or fields.get("nom")    or split_last  or ""
    email = lead.get("email")      or fields.get("email")      or fields.get("e-mail") or fields.get("mail") or ""
    phone = (fields.get("phone_number") or fields.get("telephone") or
             fields.get("mobile") or lead.get("phone_number") or "")

    raw_form = form_name or fields.get("formation_souhaitee") or fields.get("formation") or ""
    slug, name_form = infer_formation(raw_form)

    now = datetime.datetime.now(datetime.UTC).isoformat()
    return {
        "first_name": first,
        "last_name": last,
        "email_jsonb": [{"email": email}] if email else None,
        "phone_jsonb": [{"number": phone, "label": "mobile"}] if phone else None,
        "status": "lead",
        "pipeline_status": "Nouveau lead",
        "origine_lead": "Meta Lead Ads",
        "formation_souhaitee": name_form or None,
        "formation_slug": slug or None,
        "utm_source": "facebook",
        "utm_medium": "paid_social",
        "utm_campaign": lead.get("campaign_name") or None,
        "meta_lead_id": str(lead["id"]),
        "background": None,
        "first_seen": now,
        "last_seen": now,
    }

# ─── Main ────────────────────────────────────────────────────────────────────
def main():
    log(f"=== Démarrage rattrapage Meta Leads (fenêtre {CATCHUP_HOURS}h) ===")

    sb_headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    since_ts = int((datetime.datetime.now() - datetime.timedelta(hours=CATCHUP_HOURS)).timestamp())
    since_dt = datetime.datetime.fromtimestamp(since_ts).strftime("%Y-%m-%d %H:%M")
    log(f"Fenêtre: depuis {since_dt}")

    # Récupérer tous les formulaires
    url = f"https://graph.facebook.com/v19.0/{PAGE_ID}/leadgen_forms?access_token={META_TOKEN}&fields=id,name&limit=100"
    forms = get_json(url).get("data", [])
    log(f"Formulaires Meta: {len(forms)}")

    total_new = 0
    total_dup = 0
    total_err = 0
    errors = []

    for form in forms:
        leads_url = (
            f"https://graph.facebook.com/v19.0/{form['id']}/leads"
            f"?access_token={META_TOKEN}"
            f"&fields=id,first_name,last_name,email,phone_number,field_data,campaign_name,created_time"
            f"&filtering=[{{\"field\":\"time_created\",\"operator\":\"GREATER_THAN\",\"value\":\"{since_ts}\"}}]"
            f"&limit=100"
        )
        data = get_json(leads_url)
        leads = data.get("data", [])
        if not leads:
            continue

        log(f"  Formulaire '{form['name']}': {len(leads)} leads dans la fenêtre")

        for lead in leads:
            mid = str(lead["id"])

            # Vérif doublon par meta_lead_id
            chk = get_json(
                f"{SUPABASE_URL}/rest/v1/contacts?select=id&meta_lead_id=eq.{mid}&limit=1",
                {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
            )
            if chk:
                total_dup += 1
                continue

            record = map_lead(lead, form["name"])
            status_code, resp = post_json(f"{SUPABASE_URL}/rest/v1/contacts", record, sb_headers)

            if status_code in (200, 201):
                created = resp[0] if isinstance(resp, list) else resp
                ct = lead.get("created_time", "")[:10]
                log(f"    ✅ {record['first_name']} {record['last_name']} [{ct}] id={created.get('id','?')}")
                total_new += 1
            else:
                msg = f"HTTP {status_code}: {resp}"
                log(f"    ❌ Erreur pour meta_id={mid}: {msg}")
                errors.append({"meta_id": mid, "error": msg})
                total_err += 1

    log(f"=== Résumé ===")
    log(f"  Nouveaux importés : {total_new}")
    log(f"  Doublons ignorés  : {total_dup}")
    log(f"  Erreurs           : {total_err}")
    if errors:
        for e in errors:
            log(f"  ERREUR: {e}")

    # Exit code non-nul si des erreurs
    if total_err > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
