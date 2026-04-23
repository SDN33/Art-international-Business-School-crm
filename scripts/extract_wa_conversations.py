#!/usr/bin/env python3
"""
Extracteur v2 - plus exhaustif :
- Scanne TOUS les *.jsonl* (y compris .reset.*, .deleted.*)
- Patterns d'extraction élargis (heredocs, sans quotes, multi-lignes, wacli, supabase notes inserts)
- Inclut sessions main/whatsapp/superviseur des deux state dirs
- Récupère aussi les `text` "messages reçus" / "incoming" / "message de"
- Croise avec les notes contact_notes Supabase posted par le bot
"""
import json
import glob
import os
import re
import csv
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime

SESSIONS_DIRS = [
    "/root/.openclaw/agents/main/sessions",
    "/root/.openclaw/agents/whatsapp/sessions",
    "/root/.openclaw/agents/superviseur/sessions",
    "/root/.openclaw2/state/agents/main/sessions",
    "/root/.openclaw2/state/agents/whatsapp/sessions",
    "/root/.openclaw2/state/agents/superviseur/sessions",
]
OUT_DIR = "/root/wa_export"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://lmlehskymbrqxqoepuuk.supabase.co")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_SECRET_KEY")
    or ""
)

SEND_DBLQ = re.compile(
    r"openclaw\s+message\s+send[^\n]*?-t\s+[\"']?(\+?\d[\d\s\-\.]{6,20})[\"']?"
    r"[^\n]*?-m\s+\"((?:\\.|[^\"\\])*)\"",
    re.MULTILINE | re.DOTALL,
)
SEND_SGLQ = re.compile(
    r"openclaw\s+message\s+send[^\n]*?-t\s+[\"']?(\+?\d[\d\s\-\.]{6,20})[\"']?"
    r"[^\n]*?-m\s+'((?:\\.|[^'\\])*)'",
    re.MULTILINE | re.DOTALL,
)
SEND_HEREDOC = re.compile(
    r"openclaw\s+message\s+send[^\n]*?-t\s+[\"']?(\+?\d[\d\s\-\.]{6,20})[\"']?"
    r"[^\n]*?<<\s*['\"]?(\w+)['\"]?\s*\n(.*?)\n\2",
    re.MULTILINE | re.DOTALL,
)
WACLI_SEND = re.compile(
    r"wacli\s+(?:send|message)[^\n]*?(?:-t|--to|to:)\s*[\"']?(\+?\d[\d\s\-\.]{6,20})[\"']?"
    r"[^\n]*?(?:-m|--text|text:|-b|--body)\s+[\"'](.+?)[\"']",
    re.DOTALL,
)
RECIPIENT_LINE = re.compile(
    r"(?:recipient|to|destinataire)\s*[:=]\s*[\"']?(\+?\d{10,15})[\"']?"
    r"[^\n]{0,80}(?:message|body|text)\s*[:=]\s*[\"']?(.{1,500}?)[\"']?(?:\n|$)",
    re.IGNORECASE,
)
INBOUND_RE = re.compile(
    r"(?:incoming|reçu|message\s+de|from\s+lead|de\s*la\s*part\s*de)\s*[:\-]?\s*"
    r"(\+?\d[\d\s\-\.]{8,20})\s*[:\-]\s*(.{1,400})",
    re.IGNORECASE,
)


def normalize_phone(p):
    if not p:
        return None
    p = re.sub(r"[\s\-\.\(\)]", "", p)
    if p.startswith("00"):
        p = "+" + p[2:]
    if not p.startswith("+"):
        if p.startswith("33") and len(p) >= 11:
            p = "+" + p
        elif len(p) == 10 and p.startswith("0"):
            p = "+33" + p[1:]
        elif len(p) == 9:
            p = "+33" + p
    if not re.match(r"^\+\d{10,15}$", p):
        return None
    return p


def parse_iso(ts):
    if not ts:
        return ""
    try:
        return datetime.fromisoformat(str(ts).replace("Z", "+00:00")).isoformat()
    except Exception:
        return str(ts)


def cmd_text_from_args(args):
    if isinstance(args, str):
        return args
    if isinstance(args, dict):
        for key in ("command", "cmd", "script", "input", "shell", "code"):
            v = args.get(key)
            if isinstance(v, str) and v:
                return v
        return json.dumps(args, ensure_ascii=False)
    return str(args)


def extract_send_calls(cmd, meta, events):
    if not cmd or "send" not in cmd:
        return
    found = 0
    for rgx in (SEND_DBLQ, SEND_SGLQ, WACLI_SEND):
        for m in rgx.finditer(cmd):
            phone = normalize_phone(m.group(1))
            body = m.group(2)
            try:
                body = bytes(body, "utf-8").decode("unicode_escape", errors="replace")
            except Exception:
                pass
            if phone:
                events.append({
                    "phone": phone, "direction": "outbound",
                    "content": body[:2000], "ts": meta["ts"],
                    "session_id": meta["sid"], "agent": meta["agent"],
                    "source": "session/cmd",
                })
                found += 1
    for m in SEND_HEREDOC.finditer(cmd):
        phone = normalize_phone(m.group(1))
        body = m.group(3).strip()
        if phone:
            events.append({
                "phone": phone, "direction": "outbound",
                "content": body[:2000], "ts": meta["ts"],
                "session_id": meta["sid"], "agent": meta["agent"],
                "source": "session/heredoc",
            })
            found += 1
    if found == 0:
        m = re.search(
            r"openclaw\s+message\s+send.*?-t\s+\+?(\d[\d\s\-\.]{8,20}).*?-m\s+(.+)",
            cmd, re.DOTALL,
        )
        if m:
            phone = normalize_phone("+" + re.sub(r"\D", "", m.group(1)))
            body_raw = m.group(2).strip()
            body_raw = re.split(r"\s+--?\w+\s+", body_raw)[0]
            body = body_raw.strip().strip("\"'")
            if phone and body:
                events.append({
                    "phone": phone, "direction": "outbound",
                    "content": body[:2000], "ts": meta["ts"],
                    "session_id": meta["sid"], "agent": meta["agent"],
                    "source": "session/loose",
                })


def extract_inbound(text, meta, events):
    if not text or not isinstance(text, str):
        return
    for m in INBOUND_RE.finditer(text):
        phone = normalize_phone(m.group(1))
        body = m.group(2).strip().split("\n")[0]
        if phone and body and len(body) > 1:
            events.append({
                "phone": phone, "direction": "inbound",
                "content": body[:1000], "ts": meta["ts"],
                "session_id": meta["sid"], "agent": meta["agent"],
                "source": "session/text",
            })
    for m in RECIPIENT_LINE.finditer(text):
        phone = normalize_phone(m.group(1))
        body = m.group(2).strip()
        if phone:
            events.append({
                "phone": phone, "direction": "outbound",
                "content": body[:1000], "ts": meta["ts"],
                "session_id": meta["sid"], "agent": meta["agent"],
                "source": "session/text-recipient",
            })


def walk_session_file(path, events):
    sid = os.path.splitext(os.path.basename(path))[0]
    agent = (
        "whatsapp" if "/whatsapp/" in path
        else "superviseur" if "/superviseur/" in path
        else "main" if "/main/" in path
        else "?"
    )
    meta_default = {
        "sid": sid, "agent": agent,
        "ts": datetime.fromtimestamp(os.path.getmtime(path)).isoformat(),
    }
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    o = json.loads(line)
                except Exception:
                    continue
                if o.get("type") == "session" and o.get("timestamp"):
                    meta_default["ts"] = parse_iso(o["timestamp"])
                if o.get("type") != "message":
                    continue
                ts = parse_iso(o.get("timestamp")) or meta_default["ts"]
                meta = {**meta_default, "ts": ts}
                msg = o.get("message", {})
                content = msg.get("content")
                if isinstance(content, str):
                    extract_inbound(content, meta, events)
                    extract_send_calls(content, meta, events)
                    continue
                if not isinstance(content, list):
                    continue
                for c in content:
                    if not isinstance(c, dict):
                        continue
                    t = c.get("type")
                    if t == "text":
                        txt = c.get("text", "")
                        extract_inbound(txt, meta, events)
                        extract_send_calls(txt, meta, events)
                    elif t == "thinking":
                        extract_send_calls(c.get("thinking", ""), meta, events)
                    elif t == "toolCall":
                        cmd = cmd_text_from_args(c.get("arguments"))
                        extract_send_calls(cmd, meta, events)
                        extract_inbound(cmd, meta, events)
                    elif t == "toolResult":
                        out = c.get("output") or c.get("result") or c.get("content")
                        if isinstance(out, list):
                            out = " ".join(
                                x.get("text", "") if isinstance(x, dict) else str(x)
                                for x in out
                            )
                        if isinstance(out, str):
                            extract_inbound(out, meta, events)
                            extract_send_calls(out, meta, events)
    except Exception as e:
        print(f"[warn] {path}: {e}", file=sys.stderr)


def fetch_supabase(table, select, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}{params}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def fetch_supabase_notes():
    for table_attempt in ("contactNotes", "contact_notes"):
        try:
            return fetch_supabase(
                table_attempt,
                "id,date,text,contact_id,contacts(phone_number_jsonb,first_name,last_name)",
                "&order=date.desc&limit=10000",
            )
        except Exception as e:
            print(f"[supabase {table_attempt}] {e}", file=sys.stderr)
            try:
                return fetch_supabase(
                    table_attempt,
                    "id,date,text,contact_id",
                    "&order=date.desc&limit=10000",
                )
            except Exception as e2:
                print(f"[supabase {table_attempt} simple] {e2}", file=sys.stderr)
    return []


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    events = []

    files = []
    for d in SESSIONS_DIRS:
        files.extend(glob.glob(os.path.join(d, "*.jsonl")))
        files.extend(glob.glob(os.path.join(d, "*.jsonl.reset.*")))
        files.extend(glob.glob(os.path.join(d, "*.jsonl.deleted.*")))
    files = sorted(set(files))
    print(f"Scanning {len(files)} session files...", file=sys.stderr)
    for i, f in enumerate(files):
        if i % 50 == 0:
            print(f"  {i}/{len(files)}", file=sys.stderr)
        walk_session_file(f, events)
    print(f"Sessions extracted: {len(events)} events", file=sys.stderr)

    print("Fetching Supabase contact_notes...", file=sys.stderr)
    notes = fetch_supabase_notes()
    print(f"  {len(notes)} notes from CRM", file=sys.stderr)

    with open(os.path.join(OUT_DIR, "crm_notes.json"), "w", encoding="utf-8") as fh:
        json.dump(notes, fh, ensure_ascii=False, indent=2)

    seen = set()
    deduped = []
    for e in events:
        key = (e["phone"], e["direction"], e["content"][:200].strip(), e["ts"][:16])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(e)
    print(f"After dedup: {len(deduped)} events", file=sys.stderr)
    deduped.sort(key=lambda x: (x["phone"], x["ts"]))

    by_phone = defaultdict(list)
    for e in deduped:
        by_phone[e["phone"]].append(e)

    json_path = os.path.join(OUT_DIR, "conversations.json")
    with open(json_path, "w", encoding="utf-8") as fh:
        json.dump(by_phone, fh, ensure_ascii=False, indent=2)

    csv_path = os.path.join(OUT_DIR, "conversations.csv")
    with open(csv_path, "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["phone", "ts", "direction", "agent", "source", "content", "session_id"])
        for e in deduped:
            w.writerow([
                e["phone"], e["ts"], e["direction"], e["agent"], e.get("source", ""),
                e["content"].replace("\n", " ").strip(), e["session_id"],
            ])

    summary_path = os.path.join(OUT_DIR, "summary.txt")
    with open(summary_path, "w", encoding="utf-8") as fh:
        fh.write("=== EXTRACTION HISTORIQUE BOT WHATSAPP ===\n")
        fh.write(f"Sessions scanned        : {len(files)}\n")
        fh.write(f"Events extracted (raw)  : {len(events)}\n")
        fh.write(f"Events after dedup      : {len(deduped)}\n")
        fh.write(f"  - outbound            : {sum(1 for e in deduped if e['direction']=='outbound')}\n")
        fh.write(f"  - inbound             : {sum(1 for e in deduped if e['direction']=='inbound')}\n")
        fh.write(f"Phones contacted        : {len(by_phone)}\n")
        fh.write(f"CRM contact_notes       : {len(notes)}\n")
        if deduped:
            fh.write(f"Date range              : {min(e['ts'] for e in deduped)[:10]} -> {max(e['ts'] for e in deduped)[:10]}\n")
        fh.write("\n=== Top 50 phones by event count ===\n")
        for p, evs in sorted(by_phone.items(), key=lambda x: -len(x[1]))[:50]:
            ins = sum(1 for e in evs if e["direction"] == "inbound")
            outs = sum(1 for e in evs if e["direction"] == "outbound")
            first = min(e["ts"] for e in evs)[:10]
            last = max(e["ts"] for e in evs)[:10]
            fh.write(f"  {p}: {len(evs)} ({ins}in/{outs}out) {first} -> {last}\n")
        fh.write("\n=== Sources ===\n")
        sources = defaultdict(int)
        for e in deduped:
            sources[e.get("source", "?")] += 1
        for s, n in sorted(sources.items(), key=lambda x: -x[1]):
            fh.write(f"  {s}: {n}\n")

    print(f"\n>> {json_path}")
    print(f">> {csv_path}")
    print(f">> {summary_path}")
    print(f">> {os.path.join(OUT_DIR, 'crm_notes.json')}")


if __name__ == "__main__":
    main()
