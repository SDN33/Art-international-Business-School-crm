#!/usr/bin/env python3
"""Sync deal stages with contact pipeline_status values.

Strategy: batch-PATCH all deals for a given target slug in one request
using Supabase's `id=in.(...)` filter, avoiding N+1 requests.
"""
import json
import os
import urllib.request
from collections import defaultdict
from urllib.parse import quote

BASE = os.environ.get("SUPABASE_URL", "https://lmlehskymbrqxqoepuuk.supabase.co") + "/rest/v1"
KEY = os.environ["SUPABASE_SERVICE_KEY"]
HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

LABEL_TO_SLUG = {
    "Nouveau lead": "nouveau-lead",
    "Prospect": "prospect",
    "\u00c0 \u00e9valuer": "a-evaluer",
    "Contact pris": "contact-pris",
    "Contact\u00e9 WA": "contacte-wa",
    "\u00c0 rappeler": "a-rappeler",
    "Devis envoy\u00e9": "devis-envoye",
    "En n\u00e9gociation": "en-negociation",
    "Qualifi\u00e9": "qualifie",
    "Qualifi\u00e9 AFDAS": "qualifie-afdas",
    "Envoyer le dossier AFDAS": "envoyer-dossier-afdas",
    "AFDAS Court M\u00e9trage": "afdas-court-metrage",
    "Inscrit": "inscrit",
    "Converti": "converti",
    "Perdu": "perdu",
    "\u00c0 recontacter": "a-recontacter",
    "\u00c0 relancer avant perte": "a-relancer-avant-perte",
}


def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def patch(url, data):
    req = urllib.request.Request(
        url, data=json.dumps(data).encode(), headers=HEADERS, method="PATCH"
    )
    with urllib.request.urlopen(req) as r:
        return r.status


# Get all contacts with pipeline_status
contacts = fetch(f"{BASE}/contacts?select=id,pipeline_status&pipeline_status=not.is.null")
contact_status = {c["id"]: c["pipeline_status"] for c in contacts}
print(f"Contacts with pipeline_status: {len(contact_status)}")

# Get all deals
deals = fetch(f"{BASE}/deals?select=id,stage,contact_ids&order=id")
print(f"Total deals: {len(deals)}")

# Group deal IDs by target slug (only mismatches)
by_target_slug = defaultdict(list)
for deal in deals:
    if not deal.get("contact_ids") or len(deal["contact_ids"]) == 0:
        continue
    cid = deal["contact_ids"][0]
    status = contact_status.get(cid)
    if not status:
        continue
    expected_slug = LABEL_TO_SLUG.get(status)
    if not expected_slug:
        print(f"  WARNING: Unknown status '{status}' for contact {cid}")
        continue
    if deal["stage"] != expected_slug:
        by_target_slug[expected_slug].append(deal["id"])

# Batch-patch per target slug
total = sum(len(ids) for ids in by_target_slug.values())
print(f"\nDeals to update: {total}")
for slug, deal_ids in sorted(by_target_slug.items()):
    ids_str = ",".join(str(i) for i in deal_ids)
    url = f"{BASE}/deals?id=in.({quote(ids_str)})"
    print(f"  PATCH {len(deal_ids)} deals -> '{slug}'")
    patch(url, {"stage": slug})

print(f"\nDone. {total} deals synced across {len(by_target_slug)} stages.")
