import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, OptionsMiddleware } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/utils.ts";
import { AuthMiddleware, UserMiddleware } from "../_shared/authentication.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import type { User } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "AIBS <noreply@artaibs.fr>";

async function handler(req: Request, user?: User): Promise<Response> {
  if (req.method !== "POST") {
    return createErrorResponse(405, "Method not allowed");
  }

  if (!RESEND_API_KEY) {
    return createErrorResponse(500, "RESEND_API_KEY not configured");
  }

  let body: {
    to: string;
    subject: string;
    html: string;
    contact_id?: string;
    campaign_id?: number;
    first_name?: string;
  };

  try {
    body = await req.json();
  } catch {
    return createErrorResponse(400, "Invalid JSON body");
  }

  const { to, subject, html, contact_id, campaign_id, first_name } = body;

  if (!to || !subject || !html) {
    return createErrorResponse(400, "Missing required fields: to, subject, html");
  }

  // Get the sales record for the authenticated user
  let sales_id: string | null = null;
  if (user) {
    const { data: saleData } = await supabaseAdmin
      .from("sales")
      .select("id")
      .eq("user_id", user.id)
      .single();
    sales_id = saleData?.id ?? null;
  }

  // Personalise HTML with first_name if available
  const personalizedHtml = first_name
    ? html.replace(/\{\{prenom\}\}/gi, first_name).replace(/\{\{first_name\}\}/gi, first_name)
    : html;

  // Call Resend API
  let resend_id: string | null = null;
  let sendStatus = "sent";
  let errorMsg: string | null = null;

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html: personalizedHtml,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      sendStatus = "failed";
      errorMsg = resendData?.message ?? `Resend error ${resendRes.status}`;
    } else {
      resend_id = resendData?.id ?? null;
    }
  } catch (err) {
    sendStatus = "failed";
    errorMsg = err instanceof Error ? err.message : "Unknown send error";
  }

  // Log to email_logs
  await supabaseAdmin.from("email_logs").insert({
    to_email: to,
    subject,
    contact_id: contact_id ?? null,
    campaign_id: campaign_id ?? null,
    status: sendStatus,
    error_msg: errorMsg,
    resend_id,
    sales_id,
  });

  if (sendStatus === "failed") {
    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }

  return new Response(
    JSON.stringify({ success: true, resend_id }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    },
  );
}

Deno.serve(async (req) => {
  return OptionsMiddleware(req, (req) =>
    AuthMiddleware(req, (req) =>
      UserMiddleware(req, handler),
    ),
  );
});
