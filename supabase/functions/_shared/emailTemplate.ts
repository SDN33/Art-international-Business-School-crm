/**
 * Branded HTML email wrapper inspired by https://www.artaibs.fr/
 *
 * Design system:
 *  - Deep black header (#0A0A0A) with logo
 *  - Warm gold accent (#D4A24C)
 *  - Cream body (#FAF7F2) with sober serif headings + sans body
 *  - Footer with social links + certification badges (Qualiopi, AFDAS, France Travail)
 *
 * Usage:
 *   import { wrapBrandedEmail } from "../_shared/emailTemplate.ts";
 *   const html = wrapBrandedEmail({ bodyHtml, preheader, firstName });
 */

export interface BrandedEmailOptions {
  /** Inner HTML body (already personalised). Plain newlines should be converted to <br> upstream. */
  bodyHtml: string;
  /** Optional short preview text shown in inbox previews. */
  preheader?: string;
  /** Optional first name (only used to derive a default preheader). */
  firstName?: string | null;
  /** Optional CTA button. */
  cta?: { label: string; url: string };
  /** Set to true to skip wrapping if bodyHtml already starts with <html or <!doctype. */
  skipIfFullDocument?: boolean;
}

const LOGO_URL = "https://d1yei2z3i6k35z.cloudfront.net/14463881/692858008ec76_logohorizontalAIBSsol.png";
const SITE_URL = "https://www.artaibs.fr";
const QUALIOPI_URL = "https://www.artaibs.fr/qualiopi.svg";
const AFDAS_URL = "https://www.artaibs.fr/afdas_logo.webp";
const FRANCE_TRAVAIL_URL = "https://www.artaibs.fr/Logo_FranceTravail.png";
const INSTAGRAM_URL = "https://www.instagram.com/aibs.art.school/";
const LINKEDIN_URL = "https://www.linkedin.com/company/art-international-business-school";
const FACEBOOK_URL = "https://www.facebook.com/ArtinternationalBusinessSchool";

/**
 * AIBS brand palette — deep navy + soleil orange (cf. logo officiel).
 */
const COLORS = {
  navy: "#2A3A5C",        // bleu nuit AIBS (fond logo)
  navyDeep: "#1F2C47",    // variante plus sombre pour footer
  orange: "#E35D4D",      // soleil orange AIBS
  orangeSoft: "#F1A78F",  // halo orange clair
  cream: "#FAF7F2",       // fond email
  ink: "#1A1F2E",         // texte principal
  muted: "#6B7385",       // texte secondaire
  border: "#E2E5EC",
  white: "#FFFFFF",
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function wrapBrandedEmail(opts: BrandedEmailOptions): string {
  const { bodyHtml, preheader, firstName, cta, skipIfFullDocument = true } = opts;

  if (skipIfFullDocument && /^\s*(<!doctype|<html)/i.test(bodyHtml)) {
    return bodyHtml;
  }

  const previewText = preheader
    ?? (firstName
      ? `${firstName}, un message d'Art International Business School.`
      : "Un message d'Art International Business School.");

  const ctaHtml = cta
    ? `
      <tr>
        <td align="center" style="padding:8px 32px 28px;">
          <a href="${escapeHtml(cta.url)}"
             style="display:inline-block;background:${COLORS.orange};color:${COLORS.white};
                    text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;
                    font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
                    padding:14px 32px;border-radius:4px;
                    box-shadow:0 2px 0 ${COLORS.navy};">
            ${escapeHtml(cta.label)}
          </a>
        </td>
      </tr>`
    : "";

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>Art International Business School</title>
<style>
  /* Client-safe overrides */
  body { margin:0; padding:0; background:${COLORS.cream}; -webkit-font-smoothing:antialiased; }
  table { border-collapse:collapse; }
  img { border:0; outline:none; text-decoration:none; display:block; }
  a { color:${COLORS.orange}; }
  .aibs-content p { margin:0 0 14px; }
  .aibs-content a { color:${COLORS.orange}; text-decoration:underline; }
  .aibs-content strong { color:${COLORS.navy}; }
  @media (max-width:620px) {
    .aibs-card { width:100% !important; border-radius:0 !important; }
    .aibs-pad { padding-left:24px !important; padding-right:24px !important; }
    .aibs-hero { padding:32px 24px 24px !important; }
    .aibs-hero img { width:200px !important; }
    .aibs-hero h1 { font-size:14px !important; letter-spacing:2px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${COLORS.cream};">
<!-- preheader -->
<div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">
${escapeHtml(previewText)}
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background:${COLORS.cream};padding:32px 16px;">
  <tr>
    <td align="center">

      <table role="presentation" class="aibs-card" width="600" cellpadding="0" cellspacing="0"
             style="width:600px;max-width:600px;background:${COLORS.white};
                    border:1px solid ${COLORS.border};border-radius:6px;overflow:hidden;
                    box-shadow:0 1px 3px rgba(10,10,10,0.06);">

        <!-- Header -->
        <tr>
          <td class="aibs-hero" align="center"
              style="background:${COLORS.navy};padding:40px 32px 32px;">
            <a href="${SITE_URL}" style="text-decoration:none;display:inline-block;">
              <img src="${LOGO_URL}" alt="Art International Business School"
                   width="260" style="width:260px;max-width:80%;height:auto;margin:0 auto;" />
            </a>
            <div style="height:2px;background:${COLORS.orange};width:56px;margin:22px auto 16px;border-radius:2px;"></div>
            <h1 style="margin:0;color:${COLORS.white};
                       font-family:'Playfair Display','Times New Roman',Georgia,serif;
                       font-size:16px;font-weight:500;letter-spacing:3px;text-transform:uppercase;">
              Le futur de l'art s'écrit avec vous
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td class="aibs-pad aibs-content"
              style="padding:36px 44px 12px;
                     font-family:'Helvetica Neue',Arial,sans-serif;
                     font-size:15px;line-height:1.65;color:${COLORS.ink};">
            ${bodyHtml}
          </td>
        </tr>

        ${ctaHtml}

        <!-- Signature -->
        <tr>
          <td class="aibs-pad" style="padding:8px 44px 32px;
                     font-family:'Helvetica Neue',Arial,sans-serif;
                     font-size:14px;color:${COLORS.ink};">
            <div style="border-top:2px solid ${COLORS.orange};padding-top:20px;margin-top:8px;width:48px;"></div>
            <p style="margin:14px 0 4px;font-weight:700;color:${COLORS.navy};letter-spacing:0.5px;">L'équipe AIBS</p>
            <p style="margin:0;color:${COLORS.muted};font-size:13px;line-height:1.6;">
              Art International Business School &middot; Paris<br/>
              <a href="mailto:contact@artaibs.fr" style="color:${COLORS.orange};text-decoration:none;font-weight:600;">contact@artaibs.fr</a>
              &nbsp;&middot;&nbsp;
              <a href="${SITE_URL}" style="color:${COLORS.orange};text-decoration:none;font-weight:600;">artaibs.fr</a>
            </p>
          </td>
        </tr>

        <!-- Certifications -->
        <tr>
          <td align="center" style="background:${COLORS.cream};padding:24px 32px;border-top:1px solid ${COLORS.border};">
            <p style="margin:0 0 16px;font-family:'Helvetica Neue',Arial,sans-serif;
                      font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:${COLORS.navy};font-weight:700;">
              Formations certifiantes &middot; Financement
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" align="center">
              <tr>
                <td style="padding:0 16px;"><img src="${QUALIOPI_URL}" alt="Qualiopi" height="36" style="height:36px;width:auto;" /></td>
                <td style="padding:0 16px;"><img src="${AFDAS_URL}" alt="AFDAS" height="36" style="height:36px;width:auto;" /></td>
                <td style="padding:0 16px;"><img src="${FRANCE_TRAVAIL_URL}" alt="France Travail" height="36" style="height:36px;width:auto;" /></td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="background:${COLORS.navyDeep};padding:26px 32px;
                     font-family:'Helvetica Neue',Arial,sans-serif;color:#9DA6BC;font-size:11px;line-height:1.6;">
            <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin-bottom:14px;">
              <tr>
                <td style="padding:0 10px;"><a href="${INSTAGRAM_URL}" style="color:${COLORS.orange};text-decoration:none;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Instagram</a></td>
                <td style="color:#4A5670;">·</td>
                <td style="padding:0 10px;"><a href="${LINKEDIN_URL}" style="color:${COLORS.orange};text-decoration:none;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">LinkedIn</a></td>
                <td style="color:#4A5670;">·</td>
                <td style="padding:0 10px;"><a href="${FACEBOOK_URL}" style="color:${COLORS.orange};text-decoration:none;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Facebook</a></td>
              </tr>
            </table>
            <p style="margin:0;letter-spacing:1.5px;color:${COLORS.white};font-weight:600;">© ${new Date().getFullYear()} AIBS PARIS &middot; TOUS DROITS RÉSERVÉS</p>
            <p style="margin:8px 0 0;font-size:10px;color:#7A8499;">
              Vous recevez cet email car vous êtes en contact avec Art International Business School.
            </p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>
</body>
</html>`;
}
