import { OptionsMiddleware } from "../_shared/cors.ts";
import { AuthMiddleware } from "../_shared/authentication.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createErrorResponse } from "../_shared/utils.ts";
import { corsHeaders } from "../_shared/cors.ts";

const OLLAMA_URL =
  Deno.env.get("OLLAMA_URL") ?? "http://187.124.42.7:11435";
const MODEL = "minimax-m2.7:cloud";

const SYSTEM_PROMPT = `Tu es l'assistant IA du CRM AIBS (Art International Business School), une école de formation aux métiers artistiques (cinéma, doublage, voix-off, casting).
Tu as 3 rôles :

1. **Agent DB** — Tu peux exécuter des requêtes SQL (SELECT, INSERT, UPDATE, DELETE) sur la base PostgreSQL pour répondre aux questions sur les données et effectuer des modifications si l'utilisateur le demande.
2. **Data Analyste** — Tu analyses les données CRM : leads Meta, conversions, pipeline, formations, inscriptions, performance des campagnes.
3. **Guide CRM** — Tu aides les utilisateurs à utiliser le CRM : navigation, fonctionnalités, bonnes pratiques.

## Base de données
Tables principales :
- contacts (id, first_name, last_name, email_jsonb, phone_jsonb, status, pipeline_status, origine_lead, formation_souhaitee, formation_slug, utm_source, utm_medium, utm_campaign, calendly_reserved, qualification_bot, reponse_relance_email, reponse_relance_wa, indice_no_show, lien_calendly, valeur_estimee, converted_at, meta_lead_id, first_seen, last_seen, updated_at, tags, company_id, sales_id)
- companies (id, name, sector, size, phone_number, address, city, country, sales_id)
- deals (id, name, amount, stage, category, contact_ids, company_id, sales_id, created_at, updated_at, formation_souhaitee, index)
- tasks (id, contact_id, type, text, due_date, done_date, sales_id)
- contact_notes (id, contact_id, text, date, sales_id, status)
- formations (id, nom, slug, description, duree, prix, image, created_at)
- training_sessions (id, formation_id, start_date, end_date, location, max_participants, status)
- inscriptions (id, contact_id, session_id, status, created_at)
- sales (id, first_name, last_name, email, administrator, disabled)
- tags (id, name, color)
- intervenants (id, first_name, last_name, email, phone, specialty, photo)

Statuts pipeline_status : Nouveau lead → Prospect → À évaluer → Contact pris → Contacté WA → À rappeler → Devis envoyé → En négociation → Qualifié → Qualifié AFDAS → Envoyer le dossier AFDAS → AFDAS Court Métrage → Inscrit → Converti → Perdu

Stages deals : nouveau-lead, prospect, a-evaluer, contact-pris, contacte-wa, a-rappeler, devis-envoye, en-negociation, qualifie, qualifie-afdas, envoyer-dossier-afdas, afdas-court-metrage, inscrit, converti, perdu

Formations principales : Acteur Leader, Court-métrage, Doublage & Voix-Off, Journées Casting, Pro Tools & Mixage, Cannes Networking

## Contexte métier AIBS
- Les leads viennent principalement de Meta Lead Ads (Facebook/Instagram)
- Le pipeline suit le parcours : lead Meta → qualification → évaluation AFDAS → inscription → conversion
- AFDAS est l'OPCO (organisme de financement formation) du secteur culturel
- Les formations durent de 1 jour (Journées Casting) à plusieurs semaines (Acteur Leader)
- Les champs utm_source/utm_medium/utm_campaign tracent l'origine publicitaire des leads
- calendly_reserved indique si le lead a pris un RDV
- qualification_bot indique si le bot WhatsApp a qualifié le lead
- Les notes de contact ont des statuts de température : froid, tiède, chaud, inscrit

## Infrastructure VPS (bot WA)
- Les scripts Python du bot tournent sur le VPS `root@187.124.42.7` dans `/root/scripts/`
- La clé API Supabase (SUPABASE_SERVICE_ROLE_KEY) est stockée dans `/root/.env.aibs` (chmod 600)
- Pour mettre à jour la clé : `nano /root/.env.aibs` sur le VPS — aucun redéploiement nécessaire
- Scripts principaux : `qualify_new_leads.py` (bot qualification WA), `vps_visio_reminder_2h.py` (rappels visio), `vps_send_reminders_now.py` (rappels one-shot), `meta-leads-daily-catchup.py` (import leads Meta)
- Si une erreur 401 Supabase apparaît : vérifier/mettre à jour `SUPABASE_SERVICE_ROLE_KEY` dans `/root/.env.aibs`

## Règles
- Réponds toujours en français.
- Sois concis et précis.
- Quand tu montres des données, utilise des tableaux markdown.
- Pour les questions de guidage CRM, explique étape par étape.
- Si tu dois exécuter une requête SQL, retourne-la dans un bloc \`\`\`sql\`\`\` et attends les résultats.
- Pour les opérations destructives (DELETE, UPDATE, DROP, TRUNCATE, ALTER), le système demandera automatiquement une confirmation à l'utilisateur avant d'exécuter.
- Pour les métriques de conversion, compare toujours avec la période précédente quand c'est pertinent.
- Aide à identifier les leads prioritaires et les actions à mener.`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Marker embedded in assistant messages to remember a pending destructive SQL
const PENDING_START = "<!--PENDING_SQL:";
const PENDING_END = ":END_PENDING_SQL-->";

const DESTRUCTIVE_PATTERN = /\b(DELETE|UPDATE|DROP|TRUNCATE|ALTER)\b/i;
const CONFIRM_PATTERN = /\b(oui|confirmer|confirme|yes|confirm|ok|execute|exécute)\b/i;

interface SqlResult {
  data: string;
  requiresConfirmation?: boolean;
  sql?: string;
}

async function executeSql(sql: string, forceExecute = false): Promise<SqlResult> {
  const normalized = sql.trim();

  if (DESTRUCTIVE_PATTERN.test(normalized) && !forceExecute) {
    return {
      data: "⚠️ Opération destructive détectée. Confirmation requise avant exécution.",
      requiresConfirmation: true,
      sql: normalized,
    };
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("exec_sql", {
      query_text: normalized,
    });
    if (error) {
      return { data: `Erreur SQL: ${error.message}` };
    }
    return { data: JSON.stringify(data, null, 2) };
  } catch (e) {
    return { data: `Erreur: ${e}` };
  }
}

async function chatWithOllama(
  messages: ChatMessage[],
): Promise<ReadableStream> {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${await response.text()}`);
  }

  return response.body!;
}

function createStreamTransformer(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            // SSE format
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ content: parsed.message.content, done: parsed.done })}\n\n`,
              ),
            );
          }
          if (parsed.done) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          }
        } catch {
          // skip invalid JSON
        }
      }
    },
    flush(controller) {
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer);
          if (parsed.message?.content) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ content: parsed.message.content, done: parsed.done })}\n\n`,
              ),
            );
          }
        } catch {
          // skip
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    },
  });
}

async function handleNonStreaming(
  messages: ChatMessage[],
): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data = await response.json();
  return data.message?.content ?? "";
}

async function processWithSqlExecution(
  messages: ChatMessage[],
): Promise<ChatMessage[]> {
  // Check if the user is confirming a pending destructive operation
  const assistantMsgs = messages.filter((m) => m.role === "assistant");
  const userMsgs = messages.filter((m) => m.role === "user");
  const lastAssistant = assistantMsgs[assistantMsgs.length - 1];
  const lastUser = userMsgs[userMsgs.length - 1];

  if (lastUser && lastAssistant && CONFIRM_PATTERN.test(lastUser.content)) {
    const startIdx = lastAssistant.content.indexOf(PENDING_START);
    const endIdx = lastAssistant.content.indexOf(PENDING_END);
    if (startIdx !== -1 && endIdx !== -1) {
      const pendingSql = lastAssistant.content.slice(
        startIdx + PENDING_START.length,
        endIdx,
      );
      const result = await executeSql(pendingSql, true);
      const enrichedMessages: ChatMessage[] = [
        ...messages,
        {
          role: "user",
          content: `Opération confirmée. Résultats de la requête SQL :\n\`\`\`json\n${result.data}\n\`\`\`\nConfirme à l'utilisateur que l'opération a été effectuée et résume ce qui s'est passé.`,
        },
      ];
      const finalResponse = await handleNonStreaming(enrichedMessages);
      return [...enrichedMessages, { role: "assistant", content: finalResponse }];
    }
  }

  // First pass: let the AI decide if it needs SQL
  const firstResponse = await handleNonStreaming(messages);

  // Check if the response contains SQL queries
  const sqlMatch = firstResponse.match(/```sql\n([\s\S]*?)```/);
  if (!sqlMatch) {
    // No SQL needed, return as-is
    return [...messages, { role: "assistant", content: firstResponse }];
  }

  // Execute the SQL query
  const sqlQuery = sqlMatch[1].trim();
  const result = await executeSql(sqlQuery);

  // Destructive operation: ask for confirmation without executing
  if (result.requiresConfirmation && result.sql) {
    const warningContent =
      `${firstResponse}\n\n` +
      `⚠️ **CONFIRMATION REQUISE** — Cette opération va **modifier ou supprimer** des données de façon irréversible.\n\n` +
      `Répondez **"CONFIRMER"** pour exécuter, ou ignorez pour annuler.\n` +
      `${PENDING_START}${result.sql}${PENDING_END}`;
    return [...messages, { role: "assistant", content: warningContent }];
  }

  // Feed results back to AI for interpretation
  const enrichedMessages: ChatMessage[] = [
    ...messages,
    { role: "assistant", content: firstResponse },
    {
      role: "user",
      content: `Voici les résultats de la requête SQL :\n\`\`\`json\n${result.data}\n\`\`\`\nAnalyse ces résultats et réponds de manière claire et formatée.`,
    },
  ];

  return enrichedMessages;
}

Deno.serve(async (req: Request) =>
  OptionsMiddleware(req, async (req) =>
    AuthMiddleware(req, async (_req) => {
      if (req.method !== "POST") {
        return createErrorResponse(405, "Method Not Allowed");
      }

      try {
        const body = await req.json();
        const { messages: userMessages, stream = true } = body as {
          messages: ChatMessage[];
          stream?: boolean;
        };

        if (!userMessages || !Array.isArray(userMessages)) {
          return createErrorResponse(400, "messages array required");
        }

        // Build full message list with system prompt
        const fullMessages: ChatMessage[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...userMessages,
        ];

        if (!stream) {
          // Non-streaming: possibly with SQL execution
          const processedMessages = await processWithSqlExecution(fullMessages);
          const lastAssistant = processedMessages
            .filter((m) => m.role === "assistant")
            .pop();

          // If SQL was executed, get final interpretation
          if (processedMessages.length > fullMessages.length + 1) {
            const finalResponse = await handleNonStreaming(processedMessages);
            return new Response(
              JSON.stringify({ content: finalResponse }),
              {
                headers: {
                  "Content-Type": "application/json",
                  ...corsHeaders,
                },
              },
            );
          }

          return new Response(
            JSON.stringify({
              content: lastAssistant?.content ?? "",
            }),
            {
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
              },
            },
          );
        }

        // Streaming mode
        const ollamaStream = await chatWithOllama(fullMessages);
        const transformedStream = ollamaStream.pipeThrough(
          createStreamTransformer(),
        );

        return new Response(transformedStream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            ...corsHeaders,
          },
        });
      } catch (e) {
        console.error("AI Assistant error:", e);
        return createErrorResponse(500, `Internal error: ${e}`);
      }
    }),
  ),
);
