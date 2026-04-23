#!/usr/bin/env python3
"""
Construit un PDF récap : conversations WhatsApp + notes CRM bot.
Source : wa_export/conversations.json + wa_export/crm_notes.json
Sortie : wa_export/rapport_conversations.pdf
"""
import json, os, re, urllib.request, collections
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether
)
from reportlab.lib.enums import TA_LEFT

ROOT = Path(__file__).resolve().parent.parent
EXP = ROOT / "wa_export"
OUT = EXP / "rapport_conversations.pdf"

SUPABASE_URL = os.environ.get("SUPABASE_URL") or "https://lmlehskymbrqxqoepuuk.supabase.co"
SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
if not SECRET_KEY:
    # try to load from .env.development
    env_path = ROOT / ".env.development"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("SUPABASE_SECRET_KEY="):
                SECRET_KEY = line.split("=", 1)[1].strip()
                break


def fetch_contacts():
    """Map id -> {first_name, last_name, phone, ...}"""
    out = {}
    page = 0
    page_size = 1000
    while True:
        url = (f"{SUPABASE_URL}/rest/v1/contacts?select=id,first_name,last_name,"
               "phone_jsonb,email_jsonb,formation_souhaitee,pipeline_status,"
               "qualification_bot,lien_calendly,valeur_estimee,calendly_reserved")
        req = urllib.request.Request(url, headers={
            "apikey": SECRET_KEY,
            "Authorization": f"Bearer {SECRET_KEY}",
            "Range-Unit": "items",
            "Range": f"{page*page_size}-{(page+1)*page_size-1}",
        })
        with urllib.request.urlopen(req, timeout=30) as r:
            batch = json.loads(r.read())
        if not batch:
            break
        for c in batch:
            out[c["id"]] = c
        if len(batch) < page_size:
            break
        page += 1
    return out


def parse_bot_note(text: str):
    """Extrait formation/issue/details d'une note [BOT]."""
    if not text:
        return None
    if not text.lstrip().startswith("[BOT]"):
        return None
    body = text.lstrip()[5:].strip()
    parts = {}
    for chunk in body.split("|"):
        chunk = chunk.strip()
        if ":" in chunk:
            k, v = chunk.split(":", 1)
            parts[k.strip().lower()] = v.strip()
        else:
            parts.setdefault("résumé", chunk)
    return parts


def esc(s):
    if s is None: return ""
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace("\n", "<br/>"))


def main():
    notes = json.load(open(EXP / "crm_notes.json", encoding="utf-8"))
    convs = json.load(open(EXP / "conversations.json", encoding="utf-8"))

    print(f"Notes: {len(notes)}, Convs phones: {len(convs)}")
    print("Fetching contacts from Supabase...")
    try:
        contacts = fetch_contacts()
        print(f"  -> {len(contacts)} contacts")
    except Exception as e:
        print(f"  warn: {e}")
        contacts = {}

    # Group notes by contact
    by_contact = collections.defaultdict(list)
    for n in notes:
        by_contact[n.get("contact_id")].append(n)
    for cid in by_contact:
        by_contact[cid].sort(key=lambda x: x.get("date", ""))

    # === PDF ===
    doc = SimpleDocTemplate(
        str(OUT), pagesize=A4,
        leftMargin=1.5*cm, rightMargin=1.5*cm,
        topMargin=1.5*cm, bottomMargin=1.5*cm,
        title="Rapport conversations bot WhatsApp",
    )
    ss = getSampleStyleSheet()
    H1 = ParagraphStyle("H1", parent=ss["Heading1"], fontSize=18, textColor=colors.HexColor("#1f2937"))
    H2 = ParagraphStyle("H2", parent=ss["Heading2"], fontSize=13, textColor=colors.HexColor("#374151"), spaceBefore=10)
    H3 = ParagraphStyle("H3", parent=ss["Heading3"], fontSize=10.5, textColor=colors.HexColor("#1d4ed8"), spaceBefore=8, spaceAfter=2)
    P  = ParagraphStyle("P", parent=ss["BodyText"], fontSize=9, leading=12)
    Pmono = ParagraphStyle("Pm", parent=ss["BodyText"], fontSize=8.5, leading=11, textColor=colors.HexColor("#4b5563"))
    Small = ParagraphStyle("S", parent=ss["BodyText"], fontSize=8, textColor=colors.grey)

    story = []

    # === Cover ===
    story.append(Paragraph("Rapport conversations bot WhatsApp — AIBS", H1))
    story.append(Paragraph(
        f"Généré le {datetime.now().strftime('%d/%m/%Y %H:%M')}", Small))
    story.append(Spacer(1, 0.4*cm))

    # KPIs
    contacts_with_notes = len(by_contact)
    bot_notes = sum(1 for n in notes if (n.get("text") or "").lstrip().startswith("[BOT]"))
    dates = sorted(n.get("date","") for n in notes if n.get("date"))
    date_range = f"{dates[0][:10]} → {dates[-1][:10]}" if dates else "-"
    outbound = sum(len(v) for v in convs.values())

    kpi_data = [
        ["Métrique", "Valeur"],
        ["Notes CRM totales", str(len(notes))],
        ["Notes [BOT] structurées", str(bot_notes)],
        ["Contacts avec activité", str(contacts_with_notes)],
        ["Plage de dates", date_range],
        ["Messages WhatsApp sortants extraits (logs)", str(outbound)],
        ["Numéros joints", str(len(convs))],
    ]
    t = Table(kpi_data, colWidths=[7*cm, 6*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#1f2937")),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("GRID", (0,0), (-1,-1), 0.25, colors.lightgrey),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f9fafb")]),
        ("PADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.6*cm))

    # Top formations
    formations = collections.Counter()
    issues = collections.Counter()
    for n in notes:
        p = parse_bot_note(n.get("text",""))
        if p:
            if p.get("formation"): formations[p["formation"]] += 1
            if p.get("issue"): issues[p["issue"]] += 1

    if formations:
        story.append(Paragraph("Top formations évoquées", H2))
        rows = [["Formation", "Mentions"]] + [[k, str(v)] for k,v in formations.most_common(10)]
        t = Table(rows, colWidths=[10*cm, 3*cm])
        t.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#374151")),
            ("TEXTCOLOR",(0,0),(-1,0),colors.white),
            ("FONTSIZE",(0,0),(-1,-1),9),
            ("GRID",(0,0),(-1,-1),0.25,colors.lightgrey),
            ("PADDING",(0,0),(-1,-1),5),
        ]))
        story.append(t); story.append(Spacer(1, 0.3*cm))

    if issues:
        story.append(Paragraph("Top statuts (issue)", H2))
        rows = [["Issue", "Occurrences"]] + [[k, str(v)] for k,v in issues.most_common(10)]
        t = Table(rows, colWidths=[10*cm, 3*cm])
        t.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#374151")),
            ("TEXTCOLOR",(0,0),(-1,0),colors.white),
            ("FONTSIZE",(0,0),(-1,-1),9),
            ("GRID",(0,0),(-1,-1),0.25,colors.lightgrey),
            ("PADDING",(0,0),(-1,-1),5),
        ]))
        story.append(t)

    story.append(PageBreak())

    # === Détail par contact ===
    story.append(Paragraph("Détail par contact", H1))
    story.append(Paragraph(
        "Une fiche par contact ayant reçu des notes du bot, triées chronologiquement.", Small))
    story.append(Spacer(1, 0.4*cm))

    sorted_contacts = sorted(by_contact.items(), key=lambda x: -len(x[1]))

    for cid, ns in sorted_contacts:
        c = contacts.get(cid, {})
        name = " ".join(filter(None, [c.get("first_name"), c.get("last_name")])) or f"Contact #{cid}"

        phones = []
        for p in (c.get("phone_jsonb") or []):
            if isinstance(p, dict) and p.get("number"):
                phones.append(p["number"])
            elif isinstance(p, str):
                phones.append(p)
        phone_str = ", ".join(phones) if phones else "—"

        meta_bits = [f"id={cid}", phone_str]
        if c.get("formation_souhaitee"):
            meta_bits.append(f"Formation : {c['formation_souhaitee']}")
        if c.get("pipeline_status"):
            meta_bits.append(f"Statut : {c['pipeline_status']}")
        if c.get("calendly_reserved"):
            meta_bits.append("Calendly réservé")

        block = [
            Paragraph(
                f"{esc(name)}  <font size=8 color='#6b7280'>({esc(' • '.join(meta_bits))})</font>",
                H3),
        ]

        for n in ns:
            d = (n.get("date","") or "")[:16].replace("T", " ")
            txt = n.get("text","") or ""
            parsed = parse_bot_note(txt)
            if parsed:
                line_parts = []
                if parsed.get("formation"):
                    line_parts.append(f"<b>Formation</b>: {esc(parsed['formation'])}")
                if parsed.get("issue"):
                    line_parts.append(f"<b>Statut</b>: {esc(parsed['issue'])}")
                det = parsed.get("détails") or parsed.get("details") or parsed.get("résumé")
                if det:
                    line_parts.append(f"<b>Détails</b>: {esc(det)}")
                inner = " &nbsp;|&nbsp; ".join(line_parts)
                block.append(Paragraph(
                    f"<font color='#9ca3af'>[{d}]</font> "
                    f"<font color='#1d4ed8'>[BOT]</font> {inner}", P))
            else:
                block.append(Paragraph(
                    f"<font color='#9ca3af'>[{d}]</font> {esc(txt)[:600]}", Pmono))

        block.append(Spacer(1, 0.2*cm))
        story.append(KeepTogether(block))

    print(f"Building PDF ({len(story)} flowables)...")
    doc.build(story)
    print(f"OK -> {OUT}  ({OUT.stat().st_size/1024:.1f} KB)")


if __name__ == "__main__":
    main()
