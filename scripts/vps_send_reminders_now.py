#!/usr/bin/env python3
"""
AIBS - Rappels d'urgence visio (one-shot)
Envoie un WA de rappel à TOUS les contacts ayant un RDV Calendly
dans les prochaines 48h et qui n'ont pas encore reçu de rappel aujourd'hui.

Usage: python3 /root/scripts/vps_send_reminders_now.py
"""
import json
import subprocess
import os
import sys
import time
import smtplib
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# ── Credentials ────────────────────────────────────────────────────────────────
CAL_TOKEN = (
    "eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdj"
    "MzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOi"
    "JodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzc1MjA1NjAzLCJqdGkiOiI4Zjc"
    "3ZTNkMy00OTQwLTRmNzktYTNmNi03ZTE0YTdkOTc5NDkiLCJ1c2VyX3V1aWQiOiI1NTBmOTJl"
    "Ny0xMjVlLTRlZWUtYjg1Zi03MzRlYjUyZWUxNDMiLCJzY29wZSI6ImF2YWlsYWJpbGl0eTpy"
    "ZWFkIGF2YWlsYWJpbGl0eTp3cml0ZSBldmVudF90eXBlczpyZWFkIGV2ZW50X3R5cGVzOndya"
    "XRlIGxvY2F0aW9uczpyZWFkIHJvdXRpbmdfZm9ybXM6cmVhZCBzaGFyZXM6d3JpdGUgc2NoZW"
    "R1bGVkX2V2ZW50czpyZWFkIHNjaGVkdWxlZF9ldmVudHM6d3JpdGUgc2NoZWR1bGluZ19saW5"
    "rczp3cml0ZSBncm91cHM6cmVhZCBvcmdhbml6YXRpb25zOnJlYWQgb3JnYW5pemF0aW9uczp3"
    "cml0ZSB1c2VyczpyZWFkIGFjdGl2aXR5X2xvZzpyZWFkIGRhdGFfY29tcGxpYW5jZTp3cml0"
    "ZSBvdXRnb2luZ19jb21tdW5pY2F0aW9uczpyZWFkIHdlYmhvb2tzOnJlYWQgd2ViaG9va3M6d"
    "3JpdGUifQ.58CEQEYSS4z8aaHCkfxTL47TnOTVcLpI0YZwX2_b8z7f1Rz9vNioHf2JJhlSLT6"
    "knyNU6O83P6ih2qzNUyARxA"
)
CAL_USER = "https://api.calendly.com/users/550f92e7-125e-4eee-b85f-734eb52ee143"
SB_URL = "https://lmlehskymbrqxqoepuuk.supabase.co"
SB_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtbGVo"
    "c2t5bWJycXhxb2VwdXVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI1MzQzOCwi"
    "ZXhwIjoyMDkwODI5NDM4fQ.0ZOZDA8mi5OasUopvXIs70x4kSv0WZUD5jLyMrqa7Os"
)
NODE_PATH = "/root/.nvm/versions/node/v22.22.2/bin"
DELAY_BETWEEN_SENDS = 60  # secondes entre chaque envoi WA (anti-spam)

PARIS_OFFSET = timedelta(hours=2)  # CEST UTC+2 en avril 2026

# ── SMTP (à configurer via env vars quand le domaine est prêt) ─────────────────
# export SMTP_HOST=smtp.postmarkapp.com
# export SMTP_PORT=587
# export SMTP_USER=<Server-API-Token>
# export SMTP_PASS=<Server-API-Token>
# export SMTP_FROM=noreply@aibs.fr
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
FROM_EMAIL = os.environ.get("SMTP_FROM", "")
FROM_NAME  = "AIBS - Art International Business School"


# ── Helpers HTTP ───────────────────────────────────────────────────────────────
def http_get(url, params=None, headers=None):
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode())


def http_post(url, data, headers=None):
    body = json.dumps(data).encode()
    h = {"Content-Type": "application/json", **(headers or {})}
    req = urllib.request.Request(url, data=body, headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.status


def cal_headers():
    return {
        "Authorization": f"Bearer {CAL_TOKEN}",
        "User-Agent": "Mozilla/5.0 (compatible; AIBS-Bot/1.0)",
    }


def sb_headers():
    return {
        "apikey": SB_KEY,
        "Authorization": f"Bearer {SB_KEY}",
        "Content-Type": "application/json",
    }


# ── Calendly ───────────────────────────────────────────────────────────────────
def get_events(min_start: datetime, max_start: datetime):
    data = http_get(
        "https://api.calendly.com/scheduled_events",
        params={
            "user": CAL_USER,
            "status": "active",
            "min_start_time": min_start.isoformat().replace("+00:00", "Z"),
            "max_start_time": max_start.isoformat().replace("+00:00", "Z"),
            "count": 100,
        },
        headers=cal_headers(),
    )
    return data.get("collection", [])


def get_invitees(event_uuid: str):
    data = http_get(
        f"https://api.calendly.com/scheduled_events/{event_uuid}/invitees",
        params={"status": "active", "count": 50},
        headers=cal_headers(),
    )
    return data.get("collection", [])


# ── Supabase ───────────────────────────────────────────────────────────────────
def find_contact_by_email(email: str):
    try:
        data = http_get(
            f"{SB_URL}/rest/v1/contacts_summary",
            params={
                "select": "id,first_name,last_name,phone_jsonb",
                "email_fts": f"ilike.*{email}*",
                "limit": 1,
            },
            headers=sb_headers(),
        )
        return data[0] if data else None
    except Exception as e:
        print(f"    Supabase erreur: {e}")
        return None


def has_note_today(contact_id: int, note_type: str) -> bool:
    today = datetime.now(timezone.utc).date().isoformat()
    try:
        data = http_get(
            f"{SB_URL}/rest/v1/contact_notes",
            params={
                "select": "id",
                "contact_id": f"eq.{contact_id}",
                "type": f"eq.{note_type}",
                "date": f"gte.{today}T00:00:00Z",
                "limit": 1,
            },
            headers=sb_headers(),
        )
        return len(data) > 0
    except Exception:
        return False


def post_note(contact_id: int, text: str, note_type: str):
    try:
        body = json.dumps(
            {
                "contact_id": contact_id,
                "type": note_type,
                "text": text,
                "date": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            }
        ).encode()
        h = {**sb_headers(), "Prefer": "return=minimal"}
        req = urllib.request.Request(
            f"{SB_URL}/rest/v1/contact_notes", data=body, headers=h, method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status < 300
    except Exception as e:
        print(f"    Note Supabase erreur: {e}")
        return False


# ── Email SMTP ────────────────────────────────────────────────────────────────
def smtp_enabled() -> bool:
    return bool(SMTP_HOST and SMTP_USER and FROM_EMAIL)


def send_email_smtp(to_email: str, first_name: str, date_str: str, join_url: str) -> tuple[bool, str]:
    if not smtp_enabled():
        return False, "smtp not configured"
    subject = f"Rappel : votre diagnostic de carrière artistique avec l'AIBS — {date_str}"
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333">
<div style="background:#1a1a2e;padding:20px;text-align:center">
  <h2 style="color:#fff;margin:0">🎨 AIBS — Art International Business School</h2>
</div>
<div style="padding:30px">
  <p>Bonjour <strong>{first_name}</strong>,</p>
  <p>Nous vous rappelons votre <strong>diagnostic de carrière artistique</strong> avec l'AIBS :</p>
  <div style="background:#f5f5f5;border-left:4px solid #e74c3c;padding:15px;margin:20px 0">
    <strong>📅 {date_str}</strong>
  </div>
  <p>Voici votre lien de connexion :</p>
  <p style="text-align:center">
    <a href="{join_url}" style="background:#e74c3c;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block">Rejoindre la réunion</a>
  </p>
  <p style="font-size:12px;color:#666">Ou copiez ce lien : {join_url}</p>
  <p>À tout à l'heure ! 🎨</p>
  <p>L'équipe AIBS</p>
</div>
<div style="background:#f5f5f5;padding:15px;text-align:center;font-size:11px;color:#999">
  Art International Business School — contact@aibs.fr
</div>
</body></html>"""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as srv:
            srv.starttls()
            srv.login(SMTP_USER, SMTP_PASS)
            srv.sendmail(FROM_EMAIL, to_email, msg.as_string())
        return True, "ok"
    except Exception as e:
        return False, str(e)[:120]


# ── WA ─────────────────────────────────────────────────────────────────────────
def send_wa(phone: str, message: str) -> tuple[bool, str]:
    env = {**os.environ, "PATH": f"{NODE_PATH}:{os.environ.get('PATH', '')}"}
    try:
        result = subprocess.run(
            [
                "openclaw",
                "message",
                "send",
                "--channel",
                "whatsapp",
                "-t",
                phone,
                "-m",
                message,
            ],
            capture_output=True,
            text=True,
            timeout=30,
            env=env,
        )
        return result.returncode == 0, (result.stdout + result.stderr)[:300]
    except subprocess.TimeoutExpired:
        return False, "timeout"
    except FileNotFoundError:
        return False, "openclaw not found"


# ── Formatage date Paris ───────────────────────────────────────────────────────
def fmt_paris(utc_str: str) -> str:
    dt = datetime.fromisoformat(utc_str.replace("Z", "+00:00"))
    paris_dt = dt.astimezone(timezone(PARIS_OFFSET))
    days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
    months = [
        "",
        "janvier",
        "février",
        "mars",
        "avril",
        "mai",
        "juin",
        "juillet",
        "août",
        "septembre",
        "octobre",
        "novembre",
        "décembre",
    ]
    return (
        f"{days[paris_dt.weekday()]} {paris_dt.day} {months[paris_dt.month]}"
        f" à {paris_dt.hour:02d}h{paris_dt.minute:02d}"
    )


def fmt_hour_paris(utc_str: str) -> str:
    dt = datetime.fromisoformat(utc_str.replace("Z", "+00:00"))
    paris_dt = dt.astimezone(timezone(PARIS_OFFSET))
    return f"{paris_dt.hour:02d}h{paris_dt.minute:02d}"


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    now = datetime.now(timezone.utc)
    max_time = now + timedelta(hours=48)

    print(f"\n{'='*60}")
    print(f"AIBS - Rappels visio urgence")
    print(f"Plage: maintenant → {fmt_paris(max_time.isoformat())}")
    print(f"{'='*60}\n")

    try:
        events = get_events(now, max_time)
    except Exception as e:
        print(f"ERREUR Calendly: {e}")
        sys.exit(1)

    print(f"✓ {len(events)} RDV actifs trouvés dans les 48h\n")

    sent_count = 0
    skip_count = 0
    error_count = 0
    if smtp_enabled():
        print(f"✉ SMTP activé ({FROM_EMAIL} via {SMTP_HOST})")
    else:
        print("⚠ SMTP non configuré — canal email désactivé (export SMTP_HOST/USER/PASS/FROM)")

    for event in events:
        event_uri = event.get("uri", "")
        event_uuid = event_uri.split("/")[-1] if event_uri else ""
        start_time = event.get("start_time", "")
        location = event.get("location") or {}
        join_url = (
            location.get("join_url")
            or location.get("location")
            or "https://calendly.com/caroline-art-aibs/30min"
        )
        date_str = fmt_paris(start_time) if start_time else "heure inconnue"
        hour_str = fmt_hour_paris(start_time) if start_time else "?"

        print(f"📅 RDV {event_uuid[:8]}… — {date_str}")

        try:
            invitees = get_invitees(event_uuid)
        except Exception as e:
            print(f"  ERREUR invités: {e}")
            error_count += 1
            continue

        for invitee in invitees:
            name = invitee.get("name", "")
            first_name = name.split()[0] if name else "vous"
            email = invitee.get("email", "")

            if not email:
                print(f"  ⚠ Invité sans email, ignoré")
                continue

            contact = find_contact_by_email(email)
            if not contact:
                print(f"  ⚠ Contact non trouvé pour {email}")
                # Envoyer quand même si on a le num dans Calendly (text_reminder_number)
                phone = invitee.get("text_reminder_number", "")
                if not phone:
                    skip_count += 1
                    continue
                contact_id = None
            else:
                contact_id = contact["id"]
                phone_jsonb = contact.get("phone_jsonb") or []
                phone = ""
                if isinstance(phone_jsonb, list) and phone_jsonb:
                    phone = phone_jsonb[0].get("number", "")

            wa_msg = (
                f"Bonjour {first_name} ! 🔔\n\n"
                f"Rappel : votre diagnostic de carrière artistique "
                f"avec l'AIBS a lieu {date_str}.\n\n"
                f"Voici votre lien de connexion :\n"
                f"{join_url}\n\n"
                f"À tout à l'heure ! 🎨"
            )

            # ── Canal Email ────────────────────────────────────────────
            if smtp_enabled() and email:
                already_emailed = contact_id and has_note_today(contact_id, "visio_reminder_email")
                if already_emailed:
                    print(f"  ✓ Email déjà envoyé pour {email}")
                else:
                    print(f"  → Email à {email} ({first_name})…", end=" ", flush=True)
                    ok_mail, out_mail = send_email_smtp(email, first_name, date_str, join_url)
                    if ok_mail:
                        print("✓")
                        sent_count += 1
                        if contact_id:
                            post_note(contact_id,
                                f"Rappel email envoyé pour visio {date_str} (event: {event_uuid})",
                                "visio_reminder_email")
                    else:
                        print(f"✗ ({out_mail})")
                        error_count += 1

            # ── Canal WA ───────────────────────────────────────────────
            if not phone:
                if not smtp_enabled():
                    print(f"  ⚠ Pas de téléphone et SMTP désactivé pour {email}")
                    skip_count += 1
                continue

            already_wa = contact_id and has_note_today(contact_id, "visio_reminder")
            if already_wa:
                print(f"  ✓ Rappel WA déjà envoyé pour {email}")
                skip_count += 1
                continue

            print(f"  → Envoi WA à {phone} ({first_name})…", end=" ", flush=True)
            ok, output = send_wa(phone, wa_msg)

            if ok:
                print("✓")
                sent_count += 1
                if contact_id:
                    post_note(
                        contact_id,
                        f"Rappel WA envoyé pour visio {date_str} (event: {event_uuid})",
                        "visio_reminder",
                    )
                time.sleep(DELAY_BETWEEN_SENDS)
            else:
                print(f"✗ ({output[:100]})")
                error_count += 1

    print(f"\n{'='*60}")
    print(f"Résultat : {sent_count} envoyés | {skip_count} ignorés | {error_count} erreurs")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
