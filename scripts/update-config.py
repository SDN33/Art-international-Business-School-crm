import json
import urllib.request

config = {
    "title": "Art International Business School",
    "currency": "EUR",
    "taskTypes": [
        {"label": "Aucun", "value": "none"},
        {"label": "Email", "value": "email"},
        {"label": "Appel", "value": "appel"},
        {"label": "R\u00e9union", "value": "reunion"},
        {"label": "Relance", "value": "relance"},
        {"label": "Inscription", "value": "inscription"},
        {"label": "Suivi", "value": "suivi"},
        {"label": "Pr\u00e9sentation", "value": "demo"}
    ],
    "dealStages": [
        {"label": "Nouveau lead", "value": "nouveau-lead"},
        {"label": "Prospect", "value": "prospect"},
        {"label": "\u00c0 \u00e9valuer", "value": "a-evaluer"},
        {"label": "Contact pris", "value": "contact-pris"},
        {"label": "Contact\u00e9 WA", "value": "contacte-wa"},
        {"label": "\u00c0 rappeler", "value": "a-rappeler"},
        {"label": "Devis envoy\u00e9", "value": "devis-envoye"},
        {"label": "En n\u00e9gociation", "value": "en-negociation"},
        {"label": "Qualifi\u00e9", "value": "qualifie"},
        {"label": "Qualifi\u00e9 AFDAS", "value": "qualifie-afdas"},
        {"label": "Envoyer le dossier AFDAS", "value": "envoyer-dossier-afdas"},
        {"label": "AFDAS Court M\u00e9trage", "value": "afdas-court-metrage"},
        {"label": "Inscrit", "value": "inscrit"},
        {"label": "Converti", "value": "converti"},
        {"label": "\u00c0 recontacter", "value": "a-recontacter"},
        {"label": "\u00c0 relancer avant perte", "value": "a-relancer-avant-perte"},
        {"label": "Perdu", "value": "perdu"}
    ],
    "darkModeLogo": "./logos/logo_aibs_dark.svg",
    "noteStatuses": [
        {"color": "#7dbde8", "label": "Froid", "value": "froid"},
        {"color": "#e8cb7d", "label": "Ti\u00e8de", "value": "tiede"},
        {"color": "#E35D4D", "label": "Chaud", "value": "chaud"},
        {"color": "#a4e87d", "label": "Inscrit", "value": "inscrit"}
    ],
    "lightModeLogo": "./logos/logo_aibs_light.svg",
    "companySectors": [
        {"label": "Audiovisuel", "value": "audiovisuel"},
        {"label": "Cin\u00e9ma", "value": "cinema"},
        {"label": "Musique", "value": "musique"},
        {"label": "Th\u00e9\u00e2tre", "value": "theatre"},
        {"label": "Doublage & Voix", "value": "doublage-voix"},
        {"label": "Production", "value": "production"},
        {"label": "Agence / Casting", "value": "agence-casting"},
        {"label": "Diffusion & Streaming", "value": "diffusion"},
        {"label": "Formation", "value": "formation"},
        {"label": "Autre", "value": "autre"}
    ],
    "dealCategories": [
        {"label": "Autre", "value": "autre"},
        {"label": "Acteur Leader", "value": "acteur-leader"},
        {"label": "Court-m\u00e9trage", "value": "court-metrage"},
        {"label": "Doublage & Voix", "value": "doublage-voix"},
        {"label": "Pro Tools & Mixage", "value": "pro-tools-mixage"},
        {"label": "Cannes Networking", "value": "cannes-networking"},
        {"label": "R\u00e9sidence Musicale", "value": "residence-musicale"},
        {"label": "Journ\u00e9es Casting", "value": "journees-casting"}
    ],
    "dealPipelineStatuses": ["inscrit"]
}

payload = json.dumps({"config": config}).encode("utf-8")
import os
url = os.environ.get("SUPABASE_URL", "https://lmlehskymbrqxqoepuuk.supabase.co") + "/rest/v1/configuration?id=eq.1"
key = os.environ["SUPABASE_SERVICE_KEY"]

req = urllib.request.Request(url, data=payload, method="PATCH", headers={
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
})

with urllib.request.urlopen(req) as resp:
    result = json.loads(resp.read())
    stages = result[0]["config"]["dealStages"]
    print(f"{len(stages)} colonnes mises a jour:")
    for s in stages:
        print(f"  {s['value']:35s} {s['label']}")
