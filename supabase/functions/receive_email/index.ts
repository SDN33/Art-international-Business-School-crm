// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";

/**
 * Verify Resend (Svix) webhook signature.
 * Headers: svix-id, svix-timestamp, svix-signature
 * Signed content: `${svix-id}.${svix-timestamp}.${rawBody}`
 * Secret: base64-decode(secret after removing "whsec_" prefix)
 */
async function verifyResendWebhook(req: Request, rawBody: string): Promise<boolean> {
  if (!WEBHOOK_SECRET) return true; // skip if not configured

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Reject if timestamp is older than 5 minutes
  const ts = parseInt(svixTimestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const secretBase64 = WEBHOOK_SECRET.startsWith("whsec_")
    ? WEBHOOK_SECRET.slice(6)
    : WEBHOOK_SECRET;

  const secretBytes = Uint8Array.from(atob(secretBase64), (c) => c.charCodeAt(0));
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedContent));
  const computed = "v1," + btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

  // svix-signature can contain multiple signatures separated by spaces
  return svixSignature.split(" ").some((sig) => sig === computed);
}

/** Parse "Name <email>" or bare "email" into { name, email } */
function parseEmailAddress(raw: string): { name: string | null; email: string } {
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim() || null, email: match[2].trim().toLowerCase() };
  }
  return { name: null, email: raw.trim().toLowerCase() };
}

/** Look up a contact by email. Contacts store emails in a JSONB array. */
async function findContactIdByEmail(email: string): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from("contacts")
    .select("id, email_jsonb")
    .limit(200);

  if (!data) return null;

  for (const contact of data) {
    const emails: Array<{ email?: string }> = Array.isArray(contact.email_jsonb)
      ? contact.email_jsonb
      : [];
    for (const e of emails) {
      if (e.email && e.email.toLowerCase() === email) {
        return contact.id as number;
      }
    }
  }
  return null;
}

/** Fetch full email content from Resend API using email_id */
async function fetchEmailContent(emailId: string): Promise<{ text: string | null; html: string | null }> {
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
  });
  if (!res.ok) {
    console.error("Failed to fetch email content from Resend:", res.status);
    return { text: null, html: null };
  }
  const data = await res.json();
  return {
    text: (data.text as string) ?? null,
    html: (data.html as string) ?? null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();

  // Verify Svix signature
  const valid = await verifyResendWebhook(req, rawBody);
  if (!valid) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Resend webhook format: { type: "email.received", data: { email_id, from, to, subject, message_id, ... } }
  if (body.type !== "email.received") {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = body.data as Record<string, unknown>;
  if (!payload) {
    return new Response("Missing data field", { status: 400 });
  }

  const emailId = (payload.email_id as string) ?? null;
  const fromRaw = (payload.from as string) ?? "";
  const toRaw = payload.to;
  const subject = (payload.subject as string) ?? "";
  const messageId = (payload.message_id as string) ?? null;

  if (!fromRaw) {
    return new Response("Missing from field", { status: 400 });
  }

  const { name: fromName, email: fromEmail } = parseEmailAddress(fromRaw);

  // Resolve to_email
  let toEmail: string | null = null;
  if (Array.isArray(toRaw) && toRaw.length > 0) {
    toEmail = toRaw[0] as string;
  } else if (typeof toRaw === "string") {
    toEmail = toRaw;
  }

  // Fetch full email body from Resend API (not included in webhook payload)
  let textBody: string | null = null;
  let htmlBody: string | null = null;
  if (emailId) {
    const content = await fetchEmailContent(emailId);
    textBody = content.text;
    htmlBody = content.html;
  }

  // Find matching contact by sender email
  const contactId = await findContactIdByEmail(fromEmail);

  // Use email_id as idempotency key (unique per received email)
  const upsertData: Record<string, unknown> = {
    from_email: fromEmail,
    from_name: fromName,
    to_email: toEmail,
    subject,
    text_body: textBody,
    html_body: htmlBody,
    contact_id: contactId,
    is_read: false,
    resend_message_id: emailId ?? messageId,
  };

  const { error: dbError } = await supabaseAdmin
    .from("received_emails")
    .upsert(upsertData, { onConflict: "resend_message_id" });

  if (dbError) {
    console.error("DB error storing received email:", dbError);
    return new Response(JSON.stringify({ error: String(dbError) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
