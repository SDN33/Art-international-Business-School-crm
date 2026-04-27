#!/usr/bin/env python3
"""
AIBS - Rappel visio 2h avant (cron toutes les 15 min)
Envoie un WA de rappel aux contacts ayant un RDV dans 1h45-2h15.
Anti-doublon via contact_notes (type: visio_reminder_2h).

Cron: */15 * * * * /usr/bin/python3 /root/scripts/vps_visio_reminder_2h.py >> /var/log/visio-reminder.log 2>&1
"""
import json
import subprocess
import os
import smtplib
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

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
PARIS_OFFSET = timedelta(hours=2)

# Fenêtre de rappel : events qui démarrent dans [1h45 ; 2h15]
WINDOW_EARLY = timedelta(hours=1, minutes=45)
WINDOW_LATE = timedelta(hours=2, minutes=15)

# ── SMTP (à configurer via env vars quand le domaine est prêt) ─────────────────
# export SMTP_HOST=smtp.postmarkapp.com SMTP_PORT=587
# export SMTP_USER=<Server-API-Token> SMTP_PASS=<Server-API-Token>
# export SMTP_FROM=noreply@aibs.fr
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
FROM_EMAIL = os.environ.get("SMTP_FROM", "")
FROM_NAME  = "AIBS - Art International Business School"


def http_get(url, params=None, headers=None):
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode())


def cal_headers():
    return {"Authorization": f"Bearer {CAL_TOKEN}", "User-Agent": "Mozilla/5.0 (compatible; AIBS-Bot/1.0)"}


def sb_headers():
    return {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}", "Content-Type": "application/json"}


def fmt_paris(utc_str):
    dt = datetime.fromisoformat(utc_str.replace("Z", "+00:00"))
    p = dt.astimezone(timezone(PARIS_OFFSET))
    return f"{p.hour:02d}h{p.minute:02d}"


def get_events(min_start, max_start):
    data = http_get(
        "https://api.calendly.com/scheduled_events",
        params={"user": CAL_USER, "status": "active",
                "min_start_time": min_start.isoformat().replace("+00:00", "Z"),
                "max_start_time": max_start.isoformat().replace("+00:00", "Z"),
                "count": 50},
        headers=cal_headers(),
    )
    return data.get("collection", [])


def get_invitees(event_uuid):
    data = http_get(
        f"https://api.calendly.com/scheduled_events/{event_uuid}/invitees",
        params={"status": "active", "count": 20},
        headers=cal_headers(),
    )
    return data.get("collection", [])


def find_contact(email):
    data = http_get(
        f"{SB_URL}/rest/v1/contacts_summary",
        params={"select": "id,first_name,phone_jsonb", "email_fts": f"ilike.*{email}*", "limit": 1},
        headers=sb_headers(),
    )
    return data[0] if data else None


def has_note(contact_id, note_type):
    today = datetime.now(timezone.utc).date().isoformat()
    data = http_get(
        f"{SB_URL}/rest/v1/contact_notes",
        params={"select": "id", "contact_id": f"eq.{contact_id}",
                "type": f"eq.{note_type}", "date": f"gte.{today}T00:00:00Z", "limit": 1},
        headers=sb_headers(),
    )
    return len(data) > 0


def post_note(contact_id, text, note_type):
    body = json.dumps({"contact_id": contact_id, "type": note_type, "text": text,
                       "date": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}).encode()
    h = {**sb_headers(), "Prefer": "return=minimal"}
    req = urllib.request.Request(f"{SB_URL}/rest/v1/contact_notes", data=body, headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status < 300


def send_wa(phone, message):
    env = {**os.environ, "PATH": f"{NODE_PATH}:{os.environ.get('PATH', '')}"}
    r = subprocess.run(
        ["openclaw", "message", "send", "--channel", "whatsapp", "-t", phone, "-m", message],
        capture_output=True, text=True, timeout=30, env=env,
    )
    return r.returncode == 0


def smtp_enabled() -> bool:
    return bool(SMTP_HOST and SMTP_USER and FROM_EMAIL)


def send_email_smtp(to_email: str, first_name: str, hour: str, join_url: str) -> tuple[bool, str]:
    if not smtp_enabled():
        return False, "smtp not configured"
    subject = f"Rappel : votre diagnostic de carrière artistique avec l'AIBS commence dans 2h (à {hour})"
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333">
<div style="background:#1a1a2e;padding:20px;text-align:center">
  <h2 style="color:#fff;margin:0">🎨 AIBS — Art International Business School</h2>
</div>
<div style="padding:30px">
  <p>Bonjour <strong>{first_name}</strong>,</p>
  <p>Votre <strong>diagnostic de carrière artistique</strong> avec l'AIBS commence <strong>dans 2 heures</strong>, à <strong>{hour}</strong>.</p>
  <p style="text-align:center">
    <a href="{join_url}" style="background:#e74c3c;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block">⏰ Rejoindre la réunion</a>
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


def main():
    now = datetime.now(timezone.utc)
    min_start = now + WINDOW_EARLY
    max_start = now + WINDOW_LATE
    ts = now.strftime("%Y-%m-%d %H:%M UTC")

    print(f"[{ts}] Rappel 2h — fenêtre {fmt_paris(min_start.isoformat())}–{fmt_paris(max_start.isoformat())}")

    events = get_events(min_start, max_start)
    if not events:
        print(f"[{ts}] Aucun RDV dans la fenêtre.")
        return

    for event in events:
        uuid = event.get("uri", "").split("/")[-1]
        start = event.get("start_time", "")
        location = event.get("location") or {}
        join_url = location.get("join_url") or location.get("location") or "https://calendly.com/caroline-art-aibs/30min"
        hour = fmt_paris(start) if start else "?"

        for inv in get_invitees(uuid):
            email = inv.get("email", "")
            name = inv.get("name", "")
            first = name.split()[0] if name else "vous"
            if not email:
                continue

            contact = find_contact(email)
            if not contact:
                print(f"  Contact inconnu: {email}")
                continue

            cid = contact["id"]
            if has_note(cid, "visio_reminder_2h"):
            print(f"  Rappel WA 2h déjà envoyé: {email}")

            phones = contact.get("phone_jsonb") or []
            phone = phones[0].get("number", "") if phones else ""
            if not phone:
                phone = inv.get("text_reminder_number", "")

        # ── Canal Email ──────────────────────────────────────────────────
        if smtp_enabled() and email:
            if has_note(cid, "visio_reminder_2h_email"):
                print(f"  Email 2h déjà envoyé: {email}")
            else:
                ok_m, out_m = send_email_smtp(email, first, hour, join_url)
                status_m = "✓" if ok_m else "✗"
                print(f"  [{status_m}] Email 2h → {email} ({first})")
                if ok_m:
                    post_note(cid, f"Rappel email 2h avant visio {hour} (event: {uuid})", "visio_reminder_2h_email")

        # ── Canal WA ─────────────────────────────────────────────────────
        if not phone:
            if not smtp_enabled():
                print(f"  Pas de téléphone et SMTP désactivé: {email}")
                f"Votre diagnostic de carrière artistique avec l'AIBS "
                f"commence dans 2h, à {hour}.\n\n"
                f"Lien de connexion :\n{join_url}\n\nÀ tout à l'heure ! 🎨"
            )

            ok = send_wa(phone, msg)
            status = "✓" if ok else "✗"
            print(f"  [{status}] Rappel 2h → {phone} ({first})")

            if ok:
                post_note(cid, f"Rappel WA 2h avant visio {hour} (event: {uuid})", "visio_reminder_2h")


if __name__ == "__main__":
    main()
