"""Update configuration to use only the 8 simplified pipeline stages."""
import json
import os
import urllib.request

KEY = os.environ["SUPABASE_SERVICE_KEY"]
BASE = os.environ.get("SUPABASE_URL", "https://lmlehskymbrqxqoepuuk.supabase.co") + "/rest/v1"

# Get current config
req = urllib.request.Request(
    f"{BASE}/configuration?id=eq.1",
    headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"},
)
with urllib.request.urlopen(req) as r:
    current = json.loads(r.read())[0]["config"]

# Replace dealStages with simplified 8-stage pipeline
current["dealStages"] = [
    {"label": "Nouveau lead", "value": "nouveau-lead"},
    {"label": "Contact\u00e9 WA", "value": "contacte-wa"},
    {"label": "\u00c0 rappeler", "value": "a-rappeler"},
    {"label": "Qualifi\u00e9", "value": "qualifie"},
    {"label": "Qualifi\u00e9 AFDAS", "value": "qualifie-afdas"},
    {"label": "Inscrit", "value": "inscrit"},
    {"label": "Converti", "value": "converti"},
    {"label": "Perdu", "value": "perdu"},
]

# Update
payload = json.dumps({"config": current}).encode("utf-8")
req = urllib.request.Request(
    f"{BASE}/configuration?id=eq.1",
    data=payload,
    method="PATCH",
    headers={
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    },
)
with urllib.request.urlopen(req) as r:
    result = json.loads(r.read())
    stages = result[0]["config"]["dealStages"]
    print(f"{len(stages)} colonnes configurees:")
    for s in stages:
        print(f"  {s['value']:20s} {s['label']}")
