# AIBS Infrastructure & Bot Setup

> Documentation de l'infrastructure AIBS (Art International Business School) — CRM, bots WhatsApp, Calendly, et automations.
> **Ce document ne contient aucun secret** (tokens, mots de passe, clés API). Les credentials sont stockés dans `/docker/openclaw-aibs/data/scripts/.env.aibs` sur le VPS.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VPS Hostinger (187.124.42.7)                     │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────────┐ │
│  │  Docker : openclaw-aibs     │    │  Scripts Python (hors container)    │ │
│  │  ─────────────────────────  │    │  ─────────────────────────────────  │ │
│  │  • OpenClaw (WA gateway)    │    │  • qualify_new_leads.py             │ │
│  │  • Custom server.mjs        │    │  • sync_calendly_rdv.py             │ │
│  │  • Ollama (LLM local)       │    │  • aibs_inbound_bot.py              │ │
│  │  • Data mount → /data       │    │  • vps_send_reminders_now.py        │ │
│  │                             │    │  • vps_wa_relay.py                  │ │
│  └─────────────────────────────┘    │  • vps_visio_reminder_2h.py         │ │
│                                     │  • meta-leads-daily-catchup.py      │ │
│  ┌─────────────────────────────┐    └─────────────────────────────────────┘ │
│  │  WA Relay (port 8767)       │                                              │
│  │  ─────────────────────────  │    ┌─────────────────────────────────────┐ │
│  │  • HTTP → WhatsApp          │    │  Supabase Cloud                     │ │
│  │  • Admin copy → Caroline    │    │  ─────────────────────────────────  │ │
│  └─────────────────────────────┘    │  • PostgreSQL + REST API              │ │
│                                     │  • Auth + Storage                     │ │
│  ┌─────────────────────────────┐    │  • Tables : contacts, interactions, │ │
│  │  n8n Workflows              │    │    deals, tasks, notes...           │ │
│  │  ─────────────────────────  │    └─────────────────────────────────────┘ │
│  │  • Meta Leads → CRM         │                                              │
│  │  • Calendly confirmations   │    ┌─────────────────────────────────────┐ │
│  │  • Calendly reminders       │    │  Calendly API                       │ │
│  └─────────────────────────────┘    │  • User : Caroline AIBS             │ │
│                                     │  • Event : Diagnostic carrière    │ │
│                                     └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| WA Relay | `8767` | HTTP relay pour envois WhatsApp via OpenClaw |
| OpenClaw Gateway | `18790` (interne) | Gateway WhatsApp/LLM |
| Ollama | `11434` | LLM local (kimi-k2.6:cloud, minimax-m3:cloud) |
| CRM Frontend | `5173` (local dev) | Vite dev server |
| Supabase Local | `54321` / `54323` | API + Dashboard (dev local) |

---

## Fichiers & Chemins Clés

### Sur le VPS

| Fichier | Description |
|---------|-------------|
| `/docker/openclaw-aibs/custom/server.mjs` | Proxy custom OpenClaw (patched pour dmPolicy="open") |
| `/docker/openclaw-aibs/data/scripts/.env.aibs` | Variables d'environnement centralisées |
| `/root/scripts/qualify_new_leads.py` | Bot outbound : qualification des nouveaux leads |
| `/root/scripts/sync_calendly_rdv.py` | Sync Calendly → CRM (pipeline_status + interaction) |
| `/root/scripts/aibs_inbound_bot.py` | Bot inbound : réponses aux messages entrants |
| `/root/scripts/vps_send_reminders_now.py` | Rappels Calendly (24h + 2h avant RDV) |
| `/root/scripts/vps_wa_relay.py` | Relay HTTP pour envois WhatsApp |
| `/root/scripts/vps_visio_reminder_2h.py` | Rappels visio 2h avant |
| `/root/scripts/meta-leads-daily-catchup.py` | Sync quotidien Meta Leads |
| `/var/tmp/aibs-inbound-offset.json` | Offset de lecture des logs OpenClaw |
| `/var/tmp/aibs-wa-circuit-open.json` | Circuit breaker WA (anti-spam) |

### Dans le repo

| Fichier | Description |
|---------|-------------|
| `src/components/atomic-crm/pipeline/LeadsListPage.tsx` | Page pipeline avec couleurs des statuts |
| `src/components/atomic-crm/deals/ContactList.tsx` | Liste contacts avec badges pipeline |
| `n8n-workflows/` | Workflows n8n (Meta Leads, Calendly) |

---

## Crontab (VPS)

```bash
# Qualification bot — toutes les heures 9h-19h
7 9-19 * * * /usr/bin/python3 /root/scripts/qualify_new_leads.py >> /var/log/qualify-leads.log 2>&1

# Sync Calendly → CRM — toutes les 5 minutes
*/5 * * * * /usr/bin/python3 /root/scripts/sync_calendly_rdv.py >> /var/log/sync-calendly-rdv.log 2>&1

# Bot inbound (réponses prospects) — toutes les 2 minutes 9h-20h
*/2 9-20 * * * /usr/bin/python3 /root/scripts/aibs_inbound_bot.py >> /var/log/aibs-inbound-bot.log 2>&1

# Rappels Calendly — 14h et 19h
0 14 * * * /root/.openclaw/workspace/superviseur/rappels.sh >> /tmp/rappels.log 2>&1
0 19 * * * /root/.openclaw/workspace/superviseur/rappels.sh >> /tmp/rappels.log 2>&1

# Meta Leads catchup — 6h du matin
0 6 * * * /usr/bin/python3 /root/scripts/meta-leads-daily-catchup.py >> /var/log/meta-leads-catchup.log 2>&1

# Relance Calendly — toutes les heures
0 * * * * /root/.openclaw/workspace/whatsapp/relance_calendly.sh >> /tmp/relance_calendly_cron.log 2>&1
```

---

## Pipeline Status CRM

| Statut | Couleur | Description |
|--------|---------|-------------|
| `Nouveau lead` | 🟣 Violet | Lead frais, jamais contacté |
| `Contacté WA` | 🟢 Teal | Message WhatsApp envoyé par le bot |
| `À rappeler` | 🟠 Ambre | Doit être relancé |
| **RDV planifié** | 🔵 Bleu | **RDV Calendly confirmé** |
| `Qualifié` | 🔵 Indigo | Lead qualifié par conversation |
| `Qualifié AFDAS` | 🟢 Émeraude | Financement AFDAS en cours |
| `Inscrit` | 🟢 Vert | Inscription confirmée |
| `Converti` | 🟢 Vert foncé | Paiement reçu |
| `Perdu` | 🔴 Rouge | Lead perdu |

> **Note** : Le statut `RDV planifié` est automatiquement appliqué par `sync_calendly_rdv.py` quand un RDV est pris sur Calendly.

---

## Flux de Données

### 1. Nouveau Lead (Meta Ads)
```
Meta Lead Ads → n8n workflow → Supabase (contacts)
                                    ↓
                              pipeline_status = "Nouveau lead"
                              origine_lead = "Meta Lead Ads"
```

### 2. Qualification Bot (Outbound)
```
Cron (7 9-19h) → qualify_new_leads.py
                      ↓
              SELECT contacts WHERE pipeline_status IN ('Nouveau lead', 'À évaluer')
              AND calendly_reserved = false
                      ↓
              Envoi WA via Relay (port 8767)
                      ↓
              PATCH pipeline_status = "Contacté WA"
              INSERT interaction (type = "Contact sortant Bot")
              Admin copy → Caroline (+33664833292)
```

### 3. Réponse Prospect (Inbound)
```
Prospect répond sur WhatsApp → OpenClaw log
                                      ↓
              Cron (*/2 9-20h) → aibs_inbound_bot.py
                                      ↓
              Lit les logs OpenClaw → parse inbound messages
                                      ↓
              INSERT interaction (type = "Réponse lead WhatsApp")
              Appel Ollama (kimi-k2.6:cloud) → génère réponse
                                      ↓
              Si send=true : envoi WA + INSERT interaction sortante
```

### 4. RDV Calendly
```
Prospect prend RDV sur Calendly
              ↓
Cron (*/5 min) → sync_calendly_rdv.py
              ↓
GET /scheduled_events (API Calendly)
              ↓
MATCH contact par email_jsonb ou phone_jsonb
              ↓
PATCH pipeline_status = "RDV planifié"
PATCH calendly_reserved = true
INSERT interaction (type = "Rendez-vous", canal = "Calendly")
```

### 5. Rappels Calendly
```
Cron (14h, 19h) → vps_send_reminders_now.py
              ↓
GET events dans les prochaines 24h / 2h
              ↓
Envoi WA de rappel au prospect
Admin copy → Caroline
```

---

## Configuration Requise

### Variables d'environnement (`/docker/openclaw-aibs/data/scripts/.env.aibs`)

```bash
# Supabase
SUPABASE_SERVICE_ROLE_KEY=<clé_service_role>
SUPABASE_URL=https://lmlehskymbrqxqoepuuk.supabase.co

# WA Relay
WA_RELAY_URL=http://172.17.0.1:8767/send

# Calendly (token dans les scripts, pas dans .env)
# CALENDLY_TOKEN=<token_pat>
# CALENDLY_USER_URI=https://api.calendly.com/users/<uuid>

# OpenClaw
OPENCLAW_CONFIG_PATH=/root/.openclaw2/openclaw.json
OPENCLAW_STATE_DIR=/root/.openclaw2/state
```

### Ollama (VPS)

```bash
# Modèles installés
ollama pull kimi-k2.6:cloud
ollama pull minimax-m3:cloud

# Démarrage
ollama serve  # port 11434
```

---

## Dépannage

### Bot ne prospecte plus
- Vérifier `server.mjs` : `dmPolicy` doit être `"open"` (pas `"allowlist"`)
- Vérifier le circuit breaker : `/var/tmp/aibs-wa-circuit-open.json`
- Vérifier les logs : `/var/log/qualify-leads.log`

### Messages entrants non logués
- Vérifier que le cron inbound est actif : `crontab -l | grep aibs_inbound`
- Vérifier les logs : `/var/log/aibs-inbound-bot.log`
- Vérifier le fichier offset : `/var/tmp/aibs-inbound-offset.json`

### RDV Calendly non détectés
- Vérifier le cron : `crontab -l | grep sync_calendly`
- Vérifier les logs : `/var/log/sync-calendly-rdv.log`
- Tester manuellement : `python3 /root/scripts/sync_calendly_rdv.py`

### WA Relay ne répond pas
- Vérifier que le service tourne : `curl http://localhost:8767/health`
- Vérifier les logs : `/var/log/wa-relay.log`

---

## Commandes Utiles

```bash
# Voir les logs en temps réel
tail -f /var/log/qualify-leads.log
tail -f /var/log/aibs-inbound-bot.log
tail -f /var/log/sync-calendly-rdv.log

# Tester le sync Calendly manuellement
python3 /root/scripts/sync_calendly_rdv.py

# Tester le bot inbound manuellement
python3 /root/scripts/aibs_inbound_bot.py

# Vérifier le circuit breaker
cat /var/tmp/aibs-wa-circuit-open.json

# Vérifier l'offset du bot inbound
cat /var/tmp/aibs-inbound-offset.json

# Redémarrer le WA Relay
pkill -f vps_wa_relay.py
python3 /root/scripts/vps_wa_relay.py

# Vérifier les crons
crontab -l

# Vérifier les processus
ps aux | grep -E "qualify|inbound|sync_calendly|wa_relay"
```

---

## Mises à jour Récentes

| Date | Changement |
|------|-----------|
| 2026-06-09 | Ajout statut `RDV planifié` + sync Calendly automatique |
| 2026-06-09 | Ajout couleur `RDV planifié` dans le CRM (bleu) |
| 2026-06-09 | Exclusion `calendly_reserved` dans `qualify_new_leads.py` |
| 2026-06-09 | Ajout cron bot inbound (`aibs_inbound_bot.py`) |
| 2026-06-09 | Messages de qualification rendus conversationnels |
| 2026-06-09 | Fix `allowFrom` dans `server.mjs` (dmPolicy="open") |

---

*Dernière mise à jour : 2026-06-09*
