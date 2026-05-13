#!/usr/bin/env python3
"""AIBS - WA + Email Relay HTTP (port 8767)
Reçoit les requêtes POST de n8n (depuis Docker) et envoie via openclaw ou SMTP.

POST /send        { "phone": "+33...", "message": "texte" }
POST /send-email  { "to": "a@b.fr", "subject": "...", "html": "..." }
Headers:          Authorization: Bearer aibs-wa-relay-xK9mP3qR

SMTP config via env: SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM
Usage: python3 /root/scripts/vps_wa_relay.py
Démarrage auto: systemd wa-relay.service
"""
import json
import subprocess
import os
import smtplib
import logging
import time
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

RELAY_TOKEN = "aibs-wa-relay-xK9mP3qR"
PORT = 8767
NODE_PATH = "/root/.nvm/versions/node/v22.22.2/bin"
OPENCLAW_CONFIG_PATH = "/root/.openclaw2/openclaw.json"
OPENCLAW_STATE_DIR = "/root/.openclaw2/state"
WA_CIRCUIT_FILE = Path("/var/tmp/aibs-wa-relay-circuit-open.json")
WA_CIRCUIT_SECONDS = 30 * 60
ADMIN_COPY_PHONE = "+33664833292"

# SMTP — configurer via env vars quand le domaine est prêt:
# export SMTP_HOST=smtp.postmarkapp.com SMTP_PORT=587
# export SMTP_USER=<Server-API-Token> SMTP_PASS=<Server-API-Token>
# export SMTP_FROM=noreply@aibs.fr
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
FROM_EMAIL = os.environ.get("SMTP_FROM", "")
FROM_NAME  = "AIBS - Art International Business School"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("/var/log/wa-relay.log"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("wa-relay")


def _openclaw_env():
    return {
        **os.environ,
        "PATH": f"{NODE_PATH}:{os.environ.get('PATH', '')}",
        "OPENCLAW_CONFIG_PATH": OPENCLAW_CONFIG_PATH,
        "OPENCLAW_STATE_DIR": OPENCLAW_STATE_DIR,
    }


def wa_circuit_open():
    try:
        data = json.loads(WA_CIRCUIT_FILE.read_text())
        until = float(data.get("until", 0))
        if time.time() < until:
            return True, data.get("reason", "whatsapp temporarily blocked")
        WA_CIRCUIT_FILE.unlink(missing_ok=True)
    except FileNotFoundError:
        return False, ""
    except Exception:
        return False, ""
    return False, ""


def open_wa_circuit(reason, seconds=WA_CIRCUIT_SECONDS):
    try:
        WA_CIRCUIT_FILE.write_text(json.dumps({"until": time.time() + seconds, "reason": str(reason)[:240]}))
    except Exception:
        pass


def is_transport_failure(text):
    lowered = (text or "").lower()
    return any(marker in lowered for marker in [
        "not linked",
        "no active whatsapp web listener",
        "timed out",
        "timeout",
        "rate limit",
        "temporarily blocked",
    ])


def _send_openclaw(phone, message):
    return subprocess.run(
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
        env=_openclaw_env(),
    )


def _admin_copy_message(phone, message):
    return (
        "[AIBS COPIE BOT]\n"
        f"Destinataire original : {phone}\n\n"
        f"{message}"
    )[:4096]


class WARelayHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # supprime logs HTTP par défaut

    def do_POST(self):
        if self.path not in ("/send", "/send-email"):
            self._respond(404, {"error": "not found"})
            return

        auth = self.headers.get("Authorization", "")
        if auth != f"Bearer {RELAY_TOKEN}":
            log.warning(f"Unauthorized from {self.client_address[0]}")
            self._respond(401, {"error": "unauthorized"})
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
        except Exception as e:
            self._respond(400, {"error": f"invalid body: {e}"})
            return

        if self.path == "/send-email":
            self._handle_email(body)
        else:
            self._handle_wa(body)

    def _handle_email(self, body):
        to_email = str(body.get("to", "")).strip()
        subject  = str(body.get("subject", "Message AIBS")).strip()
        html     = str(body.get("html", "")).strip()
        if not to_email or "@" not in to_email:
            self._respond(400, {"error": "missing or invalid 'to'"})
            return
        if not html:
            self._respond(400, {"error": "missing 'html'"})
            return
        if not (SMTP_HOST and SMTP_USER and FROM_EMAIL):
            log.warning("Email request but SMTP not configured")
            self._respond(503, {"error": "smtp not configured on server"})
            return
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html, "html", "utf-8"))
        try:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as srv:
                srv.starttls()
                srv.login(SMTP_USER, SMTP_PASS)
                srv.sendmail(FROM_EMAIL, to_email, msg.as_string())
            log.info(f"Email sent to {to_email}: {subject[:60]}")
            self._respond(200, {"ok": True})
        except Exception as e:
            log.error(f"Email failed for {to_email}: {e}")
            self._respond(500, {"ok": False, "error": str(e)[:200]})

    def _handle_wa(self, body):
        phone   = str(body.get("phone", "")).strip()
        message = str(body.get("message", "")).strip()
        if not phone.startswith("+") or not message:
            self._respond(400, {"error": "phone must start with + and message must not be empty"})
            return
        if len(message) > 4096:
            message = message[:4093] + "..."

        circuit_open, reason = wa_circuit_open()
        if circuit_open:
            log.warning(f"WA circuit open, blocked send to {phone}: {reason}")
            self._respond(503, {"ok": False, "error": reason, "retry_after_seconds": WA_CIRCUIT_SECONDS})
            return

        try:
            result = _send_openclaw(phone, message)
            if result.returncode == 0:
                log.info(f"WA sent to {phone}: {message[:60]}…")
                if phone != ADMIN_COPY_PHONE:
                    copy_result = _send_openclaw(ADMIN_COPY_PHONE, _admin_copy_message(phone, message))
                    if copy_result.returncode == 0:
                        log.info(f"WA admin copy sent for {phone} to {ADMIN_COPY_PHONE}")
                    else:
                        log.warning(f"WA admin copy failed for {phone}: {(copy_result.stderr or copy_result.stdout)[:200]}")
                self._respond(200, {"ok": True})
            else:
                error_text = (result.stderr or result.stdout)[:500]
                if is_transport_failure(error_text):
                    open_wa_circuit(error_text)
                    log.error(f"WA transport blocked for {phone}: {error_text[:200]}")
                    self._respond(503, {"ok": False, "error": error_text[:200], "retry_after_seconds": WA_CIRCUIT_SECONDS})
                else:
                    log.error(f"WA failed for {phone}: {error_text[:200]}")
                    self._respond(500, {"ok": False, "error": error_text[:200]})
        except subprocess.TimeoutExpired:
            open_wa_circuit("openclaw timeout")
            self._respond(503, {"error": "openclaw timeout", "retry_after_seconds": WA_CIRCUIT_SECONDS})
        except FileNotFoundError:
            self._respond(500, {"error": "openclaw not found"})

    def _respond(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    log.info(f"WA Relay démarré sur port {PORT}")
    server = HTTPServer(("0.0.0.0", PORT), WARelayHandler)
    server.serve_forever()
