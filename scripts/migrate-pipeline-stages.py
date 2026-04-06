"""
Migrate pipeline stages: merge duplicates into the simplified 8-stage pipeline.

Contact pipeline_status (French labels):
  Prospect            -> Nouveau lead
  \u00c0 \u00e9valuer           -> Nouveau lead
  Contact pris        -> Contact\u00e9 WA
  Devis envoy\u00e9        -> Qualifi\u00e9
  En n\u00e9gociation      -> Qualifi\u00e9
  Envoyer le dossier AFDAS -> Qualifi\u00e9 AFDAS
  AFDAS Court M\u00e9trage -> Qualifi\u00e9 AFDAS
  \u00c0 recontacter       -> \u00c0 rappeler
  \u00c0 relancer avant perte -> Perdu

Deal stage (slugs):
  prospect            -> nouveau-lead
  a-evaluer           -> nouveau-lead
  contact-pris        -> contacte-wa
  devis-envoye        -> qualifie
  en-negociation      -> qualifie
  envoyer-dossier-afdas -> qualifie-afdas
  afdas-court-metrage -> qualifie-afdas
  a-recontacter       -> a-rappeler
  a-relancer-avant-perte -> perdu
"""
import json
import urllib.request
from collections import Counter

import os
KEY = os.environ["SUPABASE_SERVICE_KEY"]
BASE = os.environ.get("SUPABASE_URL", "https://lmlehskymbrqxqoepuuk.supabase.co") + "/rest/v1"
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

CONTACT_MIGRATION = {
    "Prospect": "Nouveau lead",
    "\u00c0 \u00e9valuer": "Nouveau lead",
    "Contact pris": "Contact\u00e9 WA",
    "Devis envoy\u00e9": "Qualifi\u00e9",
    "En n\u00e9gociation": "Qualifi\u00e9",
    "Envoyer le dossier AFDAS": "Qualifi\u00e9 AFDAS",
    "AFDAS Court M\u00e9trage": "Qualifi\u00e9 AFDAS",
    "\u00c0 recontacter": "\u00c0 rappeler",
    "\u00c0 relancer avant perte": "Perdu",
}

DEAL_MIGRATION = {
    "prospect": "nouveau-lead",
    "a-evaluer": "nouveau-lead",
    "contact-pris": "contacte-wa",
    "devis-envoye": "qualifie",
    "en-negociation": "qualifie",
    "envoyer-dossier-afdas": "qualifie-afdas",
    "afdas-court-metrage": "qualifie-afdas",
    "a-recontacter": "a-rappeler",
    "a-relancer-avant-perte": "perdu",
}


def api_get(endpoint):
    req = urllib.request.Request(f"{BASE}/{endpoint}", headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def api_patch(endpoint, data):
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}/{endpoint}",
        data=payload,
        method="PATCH",
        headers={**HEADERS, "Content-Type": "application/json", "Prefer": "return=minimal"},
    )
    with urllib.request.urlopen(req) as r:
        return r.status


def main():
    # --- Audit ---
    contacts = api_get("contacts?select=id,pipeline_status&pipeline_status=not.is.null")
    c_counts = Counter(c["pipeline_status"] for c in contacts)
    print("=== CONTACTS pipeline_status ===")
    for s, n in sorted(c_counts.items(), key=lambda x: -x[1]):
        print(f"  {n:4d}  {s}")

    deals = api_get("deals?select=id,stage&archived_at=is.null")
    d_counts = Counter(d["stage"] for d in deals)
    print("\n=== DEALS stage ===")
    for s, n in sorted(d_counts.items(), key=lambda x: -x[1]):
        print(f"  {n:4d}  {s}")

    # --- Migrate contacts ---
    print("\n=== MIGRATING CONTACTS ===")
    for old_status, new_status in CONTACT_MIGRATION.items():
        n = c_counts.get(old_status, 0)
        if n == 0:
            continue
        print(f"  {old_status:30s} -> {new_status:20s} ({n} contacts)...", end=" ")
        encoded_old = urllib.request.quote(old_status)
        status = api_patch(
            f"contacts?pipeline_status=eq.{encoded_old}",
            {"pipeline_status": new_status},
        )
        print(f"HTTP {status} OK")

    # --- Migrate deals ---
    print("\n=== MIGRATING DEALS ===")
    for old_stage, new_stage in DEAL_MIGRATION.items():
        n = d_counts.get(old_stage, 0)
        if n == 0:
            continue
        print(f"  {old_stage:30s} -> {new_stage:20s} ({n} deals)...", end=" ")
        status = api_patch(
            f"deals?stage=eq.{old_stage}",
            {"stage": new_stage},
        )
        print(f"HTTP {status} OK")

    # --- Verify ---
    print("\n=== VERIFICATION ===")
    contacts2 = api_get("contacts?select=pipeline_status&pipeline_status=not.is.null")
    c2 = Counter(c["pipeline_status"] for c in contacts2)
    print("Contacts:")
    for s, n in sorted(c2.items(), key=lambda x: -x[1]):
        print(f"  {n:4d}  {s}")

    deals2 = api_get("deals?select=stage&archived_at=is.null")
    d2 = Counter(d["stage"] for d in deals2)
    print("Deals:")
    for s, n in sorted(d2.items(), key=lambda x: -x[1]):
        print(f"  {n:4d}  {s}")


if __name__ == "__main__":
    main()
