#!/usr/bin/env python3
"""
Détecte et fusionne les contacts doublons.

Stratégie pour choisir le "winner" (celui qu'on garde) :
1. Pipeline status le + avancé (ordre PIPELINE_ORDER ci-dessous)
2. À égalité : last_seen le + récent
3. À égalité : id le + grand (= le + récent)

L'edge function merge_contacts gère ensuite :
- réassignation des notes/tasks/deals au winner
- merge des emails/phones uniques
- delete du loser

Utilise les credentials de .env.development.
"""
from __future__ import annotations
import os, sys, json, time, re
from collections import defaultdict
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_env():
    env_path = os.path.join(ROOT, ".env.development")
    env = {}
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env

ENV = load_env()
SUPABASE_URL = ENV["VITE_SUPABASE_URL"]
SECRET_KEY = ENV["SUPABASE_SECRET_KEY"]

PIPELINE_ORDER = [
    "Nouveau lead",
    "Contacté WA",
    "À rappeler",
    "Qualifié",
    "Qualifié AFDAS",
    "Inscrit",
    "Converti",
]

def pipeline_rank(status: str | None) -> int:
    if not status:
        return -1
    try:
        return PIPELINE_ORDER.index(status)
    except ValueError:
        # "Perdu" ou autre statut négatif : on évite de garder un perdu si autre dispo
        if status == "Perdu":
            return -2
        return -1

def pick_winner(rows: list[dict]) -> dict:
    """Choisi le contact le + avancé. À égalité : + récent (last_seen puis id)."""
    def key(r):
        return (
            pipeline_rank(r.get("pipeline_status")),
            r.get("last_seen") or "",
            r.get("id") or 0,
        )
    return max(rows, key=key)

def find_duplicates(contacts: list[dict]) -> list[list[dict]]:
    """Détecte clusters de doublons par meta_lead_id, phone, email (union-find)."""
    parent = {}
    def find(x):
        while parent.get(x, x) != x:
            parent[x] = parent.get(parent[x], parent[x])
            x = parent[x]
        return x
    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    by_meta: dict[str, list[int]] = defaultdict(list)
    by_phone: dict[str, list[int]] = defaultdict(list)
    by_email: dict[str, list[int]] = defaultdict(list)

    for c in contacts:
        cid = c["id"]
        parent.setdefault(cid, cid)
        meta = (c.get("meta_lead_id") or "").strip()
        if meta:
            by_meta[meta].append(cid)
        phones = c.get("phone_jsonb") or []
        if isinstance(phones, list) and phones:
            num = (phones[0] or {}).get("number") or ""
            num_norm = re.sub(r"[^0-9+]", "", num).lower()
            if len(num_norm) >= 8:
                by_phone[num_norm].append(cid)
        emails = c.get("email_jsonb") or []
        if isinstance(emails, list) and emails:
            em = ((emails[0] or {}).get("email") or "").strip().lower()
            if em:
                by_email[em].append(cid)

    for buckets in (by_meta, by_phone, by_email):
        for ids in buckets.values():
            if len(ids) >= 2:
                for x in ids[1:]:
                    union(ids[0], x)

    by_id = {c["id"]: c for c in contacts}
    clusters: dict[int, list[dict]] = defaultdict(list)
    for cid in by_id:
        clusters[find(cid)].append(by_id[cid])
    return [v for v in clusters.values() if len(v) >= 2]


def fetch_all_contacts() -> list[dict]:
    """Pagine /rest/v1/contacts pour tout récupérer."""
    rows: list[dict] = []
    page = 1000
    offset = 0
    while True:
        url = (
            f"{SUPABASE_URL}/rest/v1/contacts?"
            f"select=id,first_name,last_name,pipeline_status,last_seen,first_seen,"
            f"meta_lead_id,formation_souhaitee,email_jsonb,phone_jsonb,calendly_reserved"
            f"&order=id.asc"
        )
        req = Request(url, headers={
            "apikey": SECRET_KEY,
            "Authorization": f"Bearer {SECRET_KEY}",
            "Range-Unit": "items",
            "Range": f"{offset}-{offset + page - 1}",
        })
        with urlopen(req, timeout=30) as r:
            batch = json.loads(r.read())
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page:
            break
        offset += page
    return rows


def call_merge(loser_id: int, winner_id: int, winner: dict, loser: dict) -> tuple[bool, str]:
    """Merge via REST API direct (service-role bypass RLS).
    1. réassigne contact_notes/tasks/deals au winner
    2. update winner avec données fusionnées (pipeline le + avancé, etc.)
    3. delete loser
    """
    headers = {
        "apikey": SECRET_KEY,
        "Authorization": f"Bearer {SECRET_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    def rest(method, path, body=None):
        url = f"{SUPABASE_URL}/rest/v1{path}"
        data = json.dumps(body).encode() if body is not None else None
        req = Request(url, data=data, method=method, headers=headers)
        return urlopen(req, timeout=30)

    try:
        # 1. réassigner
        rest("PATCH", f"/contact_notes?contact_id=eq.{loser_id}", {"contact_id": winner_id})
        rest("PATCH", f"/tasks?contact_id=eq.{loser_id}", {"contact_id": winner_id})

        # deals : contact_ids est un array bigint, plus complexe. On charge, on patch.
        deals_url = f"/deals?contact_ids=cs.{{{loser_id}}}&select=id,contact_ids"
        with urlopen(Request(f"{SUPABASE_URL}/rest/v1{deals_url}", headers=headers), timeout=30) as r:
            deals = json.loads(r.read())
        for d in deals:
            new_ids = list({i for i in d["contact_ids"] if i != loser_id} | {winner_id})
            rest("PATCH", f"/deals?id=eq.{d['id']}", {"contact_ids": new_ids})

        # 2. merge données : pipeline le + avancé, last_seen le + récent, fields nullables
        merged_emails = _merge_obj_arr(winner.get("email_jsonb") or [], loser.get("email_jsonb") or [], "email")
        merged_phones = _merge_obj_arr(winner.get("phone_jsonb") or [], loser.get("phone_jsonb") or [], "number")
        best_status = (winner.get("pipeline_status")
                       if pipeline_rank(winner.get("pipeline_status")) >= pipeline_rank(loser.get("pipeline_status"))
                       else loser.get("pipeline_status"))
        last_seen = max((x for x in [winner.get("last_seen"), loser.get("last_seen")] if x), default=None)
        first_seen = min((x for x in [winner.get("first_seen"), loser.get("first_seen")] if x), default=None)

        update_body = {
            "email_jsonb": merged_emails,
            "phone_jsonb": merged_phones,
            "pipeline_status": best_status,
            "first_name": winner.get("first_name") or loser.get("first_name"),
            "last_name": winner.get("last_name") or loser.get("last_name"),
            "formation_souhaitee": winner.get("formation_souhaitee") or loser.get("formation_souhaitee"),
            "calendly_reserved": winner.get("calendly_reserved") or loser.get("calendly_reserved") or False,
            "meta_lead_id": winner.get("meta_lead_id") or loser.get("meta_lead_id"),
            "last_seen": last_seen,
            "first_seen": first_seen,
        }
        rest("PATCH", f"/contacts?id=eq.{winner_id}", {k: v for k, v in update_body.items() if v is not None})

        # 3. delete loser
        rest("DELETE", f"/contacts?id=eq.{loser_id}")
        return True, "ok"
    except HTTPError as e:
        return False, f"HTTP {e.code}: {e.read().decode()[:300]}"
    except Exception as e:
        return False, str(e)[:300]


def _merge_obj_arr(a: list, b: list, key: str) -> list:
    seen = set()
    out = []
    for item in (a or []) + (b or []):
        if not isinstance(item, dict):
            continue
        k = (item.get(key) or "").strip().lower()
        if not k or k in seen:
            continue
        seen.add(k)
        out.append(item)
    return out


def main():
    dry_run = "--apply" not in sys.argv
    limit = None
    for i, a in enumerate(sys.argv):
        if a == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])
    print(f"=== Mode: {'DRY-RUN' if dry_run else 'APPLY'} (limit={limit}) ===")
    print("Fetching contacts from Supabase...")
    contacts = fetch_all_contacts()
    print(f"  -> {len(contacts)} contacts")

    clusters = find_duplicates(contacts)
    print(f"\n{len(clusters)} clusters de doublons détectés.\n")
    if limit:
        clusters = clusters[:limit]
        print(f"(limité aux {limit} premiers clusters)\n")

    summary = {"groups": len(clusters), "total_dups": 0, "merged": 0, "errors": 0}

    for i, group in enumerate(clusters, 1):
        winner = pick_winner(group)
        losers = [c for c in group if c["id"] != winner["id"]]
        summary["total_dups"] += len(losers)

        print(f"--- Cluster {i} ({len(group)} contacts) ---")
        for c in group:
            mark = "🏆 KEEP" if c["id"] == winner["id"] else "  → merge into winner"
            ps = c.get("pipeline_status") or "-"
            ls = (c.get("last_seen") or "")[:10]
            fn = (c.get("first_name") or "")[:15]
            ln = (c.get("last_name") or "")[:20]
            print(f"  {mark} id={c['id']:<5} {fn:<15} {ln:<20} status={ps:<18} last_seen={ls}")

        if dry_run:
            continue

        for loser in losers:
            ok, msg = call_merge(loser["id"], winner["id"], winner, loser)
            if ok:
                summary["merged"] += 1
                print(f"    ✓ merged loser={loser['id']} → {winner['id']}")
            else:
                summary["errors"] += 1
                print(f"    ✗ FAIL loser={loser['id']}: {msg}")
            time.sleep(0.05)

    print(f"\n=== Résumé ===")
    print(f"Clusters     : {summary['groups']}")
    print(f"Doublons     : {summary['total_dups']}")
    if not dry_run:
        print(f"Merged OK    : {summary['merged']}")
        print(f"Errors       : {summary['errors']}")
    else:
        print("\n→ Relance avec --apply pour exécuter les merges")

if __name__ == "__main__":
    main()
