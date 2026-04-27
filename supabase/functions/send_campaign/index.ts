import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, OptionsMiddleware } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/utils.ts";
import { AuthMiddleware, UserMiddleware } from "../_shared/authentication.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import type { User } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "AIBS <noreply@artaibs.fr>";

async function sendOneEmail(
  to: string,
  subject: string,
  html: string,
  firstName?: string | null,
): Promise<{ success: boolean; resend_id?: string; error?: string }> {
  const personalizedHtml = firstName
    ? html.replace(/\{\{prenom\}\}/gi, firstName).replace(/\{\{first_name\}\}/gi, firstName)
    : html;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html: personalizedHtml }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.message ?? `Resend ${res.status}` };
    }
    return { success: true, resend_id: data?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "send error" };
  }
}

async function handler(req: Request, user?: User): Promise<Response> {
  if (req.method !== "POST") return createErrorResponse(405, "Method not allowed");
  if (!RESEND_API_KEY) return createErrorResponse(500, "RESEND_API_KEY not configured");

  let body: { campaign_id: number };
  try {
    body = await req.json();
  } catch {
    return createErrorResponse(400, "Invalid JSON");
  }

  const { campaign_id } = body;
  if (!campaign_id) return createErrorResponse(400, "Missing campaign_id");

  // Fetch campaign
  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from("email_campaigns")
    .select("*")
    .eq("id", campaign_id)
    .single();

  if (campaignError || !campaign) {
    return createErrorResponse(404, "Campaign not found");
  }
  if (campaign.status === "sent") {
    return createErrorResponse(409, "Campaign already sent");
  }

  // Get sales_id
  let sales_id: string | null = null;
  if (user) {
    const { data: saleData } = await supabaseAdmin
      .from("sales")
      .select("id")
      .eq("user_id", user.id)
      .single();
    sales_id = saleData?.id ?? null;
  }

  // Mark as sending
  await supabaseAdmin
    .from("email_campaigns")
    .update({ status: "sending" })
    .eq("id", campaign_id);

  // Fetch recipients
  const { data: recipients } = await supabaseAdmin
    .from("email_campaign_contacts")
    .select("*")
    .eq("campaign_id", campaign_id)
    .eq("status", "pending");

  if (!recipients || recipients.length === 0) {
    await supabaseAdmin
      .from("email_campaigns")
      .update({ status: "sent", sent_at: new Date().toISOString(), total_sent: 0 })
      .eq("id", campaign_id);
    return new Response(JSON.stringify({ success: true, total_sent: 0 }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  let totalSent = 0;
  let totalError = 0;

  for (const recipient of recipients) {
    const result = await sendOneEmail(
      recipient.email,
      campaign.subject,
      campaign.html_body,
      recipient.first_name,
    );

    const newStatus = result.success ? "sent" : "failed";
    await supabaseAdmin
      .from("email_campaign_contacts")
      .update({
        status: newStatus,
        sent_at: result.success ? new Date().toISOString() : null,
        error_msg: result.error ?? null,
      })
      .eq("id", recipient.id);

    // Log
    await supabaseAdmin.from("email_logs").insert({
      to_email: recipient.email,
      subject: campaign.subject,
      contact_id: recipient.contact_id ?? null,
      campaign_id,
      status: newStatus,
      error_msg: result.error ?? null,
      resend_id: result.resend_id ?? null,
      sales_id,
    });

    if (result.success) totalSent++;
    else totalError++;

    // Small rate-limit pause (Resend free: 2 req/s)
    await new Promise((r) => setTimeout(r, 600));
  }

  await supabaseAdmin
    .from("email_campaigns")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      total_sent: totalSent,
      total_error: totalError,
    })
    .eq("id", campaign_id);

  return new Response(
    JSON.stringify({ success: true, total_sent: totalSent, total_error: totalError }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } },
  );
}

Deno.serve(async (req) => {
  return OptionsMiddleware(req, (req) =>
    AuthMiddleware(req, (req) =>
      UserMiddleware(req, handler),
    ),
  );
});
