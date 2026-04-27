#!/usr/bin/env python3
"""
AIBS - Script de déploiement complet du système de notifications visio
Déploie sur le VPS :
  1. vps_wa_relay.py + service systemd wa-relay
  2. vps_visio_reminder_2h.py + cron toutes les 15min
  3. Workflows n8n (confirmation + rappel 2h)
  4. Lance le script d'urgence vps_send_reminders_now.py immédiatement

Usage: python3 scripts/deploy_visio_notifications.py [--no-emergency]
"""
import subprocess
import sys
import os
import json
import urllib.request
import urllib.error
import time

VPS = "root@187.124.42.7"
N8N_BASE = "http://187.124.42.7:32768"
N8N_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiNmIwOTRjOC1iMjYwLTQ5NzUt"
    "YjUyMS05ZGMwZGYxMjlkYTAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIj"
    "oiYTZhYzQ1MGYtZDk4NS00MzI1LWIzOGYtZGRhMjVjZDUwNzEzIiwiaWF0IjoxNzc1NDM1NTI4"
    "fQ.uPleSHrmaa26CNDbkFBwYwgbVphwfORR2Od5E3_NiP8"
)

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.dirname(SCRIPTS_DIR)

SSH_OPTS = ["-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=15"]

WA_RELAY_SERVICE = """[Unit]
Description=AIBS WA Relay Service
After=network.target

[Service]
Type=simple
User=root
Environment=PATH=/root/.nvm/versions/node/v22.22.2/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/usr/bin/python3 /root/scripts/vps_wa_relay.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
"""


def run_ssh(cmd, capture=True):
    """Exécute une commande SSH sur le VPS."""
    args = ["ssh"] + SSH_OPTS + [VPS, cmd]
    print(f"  SSH: {cmd[:80]}{'...' if len(cmd) > 80 else ''}")
    r = subprocess.run(args, capture_output=capture, text=True, timeout=60)
    if r.returncode != 0 and capture:
        print(f"  WARN stderr: {r.stderr.strip()[:200]}")
    return r


def upload_file(local_path, remote_path):
    """Upload un fichier sur le VPS via SSH cat."""
    with open(local_path, "r", encoding="utf-8") as f:
        content = f.read()
    args = ["ssh"] + SSH_OPTS + [VPS, f"cat > {remote_path}"]
    print(f"  Upload: {os.path.basename(local_path)} → {remote_path}")
    r = subprocess.run(args, input=content, text=True, capture_output=True, timeout=30)
    if r.returncode != 0:
        print(f"  ERROR: {r.stderr.strip()}")
        return False
    return True


def upload_string(content, remote_path):
    """Upload du contenu string sur le VPS."""
    args = ["ssh"] + SSH_OPTS + [VPS, f"cat > {remote_path}"]
    print(f"  Upload string → {remote_path}")
    r = subprocess.run(args, input=content, text=True, capture_output=True, timeout=30)
    if r.returncode != 0:
        print(f"  ERROR: {r.stderr.strip()}")
        return False
    return True


def n8n_api(method, path, body=None):
    """Appel API n8n."""
    url = f"{N8N_BASE}/api/v1{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        url, data=data, method=method,
        headers={
            "X-N8N-API-KEY": N8N_KEY,
            "Content-Type": "application/json",
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body_txt = e.read().decode()[:300]
        print(f"  n8n API {method} {path} → HTTP {e.code}: {body_txt}")
        return None


def deploy_wa_relay():
    print("\n=== 1/4 Déploiement wa-relay ===")
    run_ssh("mkdir -p /root/scripts")
    ok = upload_file(os.path.join(SCRIPTS_DIR, "vps_wa_relay.py"), "/root/scripts/vps_wa_relay.py")
    if not ok:
        print("  ERREUR upload wa_relay!")
        return False
    run_ssh("chmod +x /root/scripts/vps_wa_relay.py")
    ok2 = upload_string(WA_RELAY_SERVICE, "/etc/systemd/system/wa-relay.service")
    if not ok2:
        print("  ERREUR upload service!")
        return False
    run_ssh("systemctl daemon-reload")
    run_ssh("systemctl enable wa-relay")
    run_ssh("systemctl restart wa-relay")
    time.sleep(3)
    r = run_ssh("systemctl is-active wa-relay")
    status = r.stdout.strip()
    if status == "active":
        print("  ✓ wa-relay actif")
    else:
        print(f"  ✗ wa-relay status: {status}")
        run_ssh("journalctl -u wa-relay -n 20 --no-pager")
    return status == "active"


def deploy_cron_scripts():
    print("\n=== 2/4 Déploiement scripts cron ===")
    # Script reminder 2h
    ok1 = upload_file(os.path.join(SCRIPTS_DIR, "vps_visio_reminder_2h.py"), "/root/scripts/vps_visio_reminder_2h.py")
    # Script emergency (utile pour relancer manuellement plus tard)
    ok2 = upload_file(os.path.join(SCRIPTS_DIR, "vps_send_reminders_now.py"), "/root/scripts/vps_send_reminders_now.py")
    if not ok1 or not ok2:
        print("  ERREUR upload scripts!")
        return False
    run_ssh("chmod +x /root/scripts/vps_visio_reminder_2h.py /root/scripts/vps_send_reminders_now.py")

    # Créer le fichier de log
    run_ssh("touch /var/log/visio-reminder.log")

    # Ajouter les crons (idempotent : on vérifie avant d'ajouter)
    crons = [
        "*/15 * * * * /usr/bin/python3 /root/scripts/vps_visio_reminder_2h.py >> /var/log/visio-reminder.log 2>&1",
    ]
    for cron in crons:
        # Vérifier si déjà présent
        r = run_ssh(f"crontab -l 2>/dev/null | grep -F '{cron[:40]}'")
        if r.returncode == 0 and r.stdout.strip():
            print(f"  Cron déjà présent: {cron[:60]}...")
        else:
            cmd = f"(crontab -l 2>/dev/null; echo '{cron}') | crontab -"
            run_ssh(cmd)
            print(f"  ✓ Cron ajouté: {cron[:60]}...")

    # Vérifier
    r = run_ssh("crontab -l")
    print(f"  Crontab actuel:\n{r.stdout}")
    return True


def deploy_n8n_workflows():
    print("\n=== 3/4 Déploiement workflows n8n ===")

    # Créer la credential SMTP si elle n'existe pas encore
    existing_creds = n8n_api("GET", "/credentials") or {}
    cred_list = existing_creds.get("data", [])
    smtp_cred_id = next((c["id"] for c in cred_list if c.get("name") == "AIBS SMTP"), None)
    if smtp_cred_id:
        print(f"  Credential SMTP déjà présente (id: {smtp_cred_id})")
    else:
        cred_payload = {
            "name": "AIBS SMTP",
            "type": "smtp",
            "data": {
                "host": "smtp.postmarkapp.com",
                "port": 587,
                "secure": False,
                "user": "",
                "password": "",
                "disableStartTls": False
            }
        }
        cred_result = n8n_api("POST", "/credentials", cred_payload)
        if cred_result and cred_result.get("id"):
            smtp_cred_id = cred_result["id"]
            print(f"  ✓ Credential SMTP créée (id: {smtp_cred_id})")
            print(f"  ⚠ Remplir les champs user/password dans n8n UI : {N8N_BASE}/credentials")
        else:
            print("  ⚠ Credential SMTP non créée (API /credentials peut nécessiter une permission)")

    workflow_files = [
        os.path.join(REPO_DIR, "n8n-workflows", "calendly-confirmation.json"),
        os.path.join(REPO_DIR, "n8n-workflows", "calendly-rappel-2h.json"),
    ]

    for wf_path in workflow_files:
        if not os.path.exists(wf_path):
            print(f"  Fichier manquant: {wf_path}")
            continue

        with open(wf_path, "r", encoding="utf-8") as f:
            wf_data = json.load(f)

        wf_name = wf_data.get("name", os.path.basename(wf_path))
        print(f"  Déploiement: {wf_name}")

        # Vérifier si workflow existe déjà
        existing = n8n_api("GET", "/workflows?limit=50")
        existing_id = None
        if existing and "data" in existing:
            for wf in existing["data"]:
                if wf.get("name") == wf_name:
                    existing_id = wf.get("id")
                    break

        # n8n API refuse le champ "active" dans le body (read-only)
        wf_payload = {k: v for k, v in wf_data.items() if k != "active"}

        if existing_id:
            print(f"  Workflow '{wf_name}' déjà présent (id: {existing_id}), mise à jour...")
            # Désactiver avant mise à jour
            n8n_api("PATCH", f"/workflows/{existing_id}", {"active": False})
            result = n8n_api("PUT", f"/workflows/{existing_id}", wf_payload)
        else:
            result = n8n_api("POST", "/workflows", wf_payload)

        if result and result.get("id"):
            wf_id = result["id"]
            print(f"  ✓ Workflow créé/mis à jour (id: {wf_id})")
            # Activer
            act = n8n_api("PATCH", f"/workflows/{wf_id}/activate")
            if act:
                print(f"  ✓ Workflow activé")
            else:
                print(f"  ✗ Activation échouée, tentative via PUT...")
                n8n_api("PATCH", f"/workflows/{wf_id}", {"active": True})
        else:
            print(f"  ✗ Échec déploiement {wf_name}")

    return True


def run_emergency_script():
    print("\n=== 4/4 Script d'urgence — rappels immédiats ===")
    print("  Lancement de vps_send_reminders_now.py sur le VPS...")
    r = run_ssh("/usr/bin/python3 /root/scripts/vps_send_reminders_now.py", capture=False)
    return r.returncode == 0


def main():
    skip_emergency = "--no-emergency" in sys.argv
    print("=== AIBS - Déploiement notifications visio ===\n")

    errors = []

    if not deploy_wa_relay():
        errors.append("wa-relay")

    if not deploy_cron_scripts():
        errors.append("cron-scripts")

    if not deploy_n8n_workflows():
        errors.append("n8n-workflows")

    if not skip_emergency:
        if not run_emergency_script():
            errors.append("emergency-script")
    else:
        print("\n[--no-emergency] Script d'urgence ignoré.")

    print("\n=== Résumé ===")
    if errors:
        print(f"  ✗ Erreurs: {', '.join(errors)}")
    else:
        print("  ✓ Tout déployé avec succès !")
    print("  Logs cron: ssh root@187.124.42.7 'tail -f /var/log/visio-reminder.log'")
    print("  Status relay: ssh root@187.124.42.7 'systemctl status wa-relay'")
    print(f"  n8n: {N8N_BASE}/workflows")


if __name__ == "__main__":
    main()
