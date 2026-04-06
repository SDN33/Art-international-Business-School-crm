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

1. **Agent DB** — Tu peux exécuter des requêtes SQL en lecture seule (SELECT) sur la base PostgreSQL pour répondre aux questions sur les données.
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

## Règles
- N'exécute JAMAIS de requêtes INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE.
- Réponds toujours en français.
- Sois concis et précis.
- Quand tu montres des données, utilise des tableaux markdown.
- Pour les questions de guidage CRM, explique étape par étape.
- Si tu dois exécuter une requête SQL, retourne-la dans un bloc \`\`\`sql\`\`\` et attends les résultats.
- Pour les métriques de conversion, compare toujours avec la période précédente quand c'est pertinent.
- Aide à identifier les leads prioritaires et les actions à mener.`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

async function executeReadOnlyQuery(sql: string): Promise<string> {
  // Sanitize: only allow SELECT statements
  const normalized = sql.trim().replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim();
  const firstWord = normalized.split(/\s+/)[0]?.toUpperCase();
  if (firstWord !== "SELECT" && firstWord !== "WITH") {
    return "❌ Seules les requêtes SELECT sont autorisées.";
  }

  // Additional safety checks
  const forbidden = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|EXECUTE|COPY)\b/i;
  if (forbidden.test(normalized)) {
    return "❌ Requête interdite. Seules les requêtes en lecture sont autorisées.";
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("exec_readonly_sql", {
      query_text: sql,
    });
    if (error) {
      // Fallback: use the Management API if RPC not available
      return `Erreur SQL: ${error.message}`;
    }
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `Erreur: ${e}`;
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
  const result = await executeReadOnlyQuery(sqlQuery);

  // Feed results back to AI for interpretation
  const enrichedMessages: ChatMessage[] = [
    ...messages,
    { role: "assistant", content: firstResponse },
    {
      role: "user",
      content: `Voici les résultats de la requête SQL :\n\`\`\`json\n${result}\n\`\`\`\nAnalyse ces résultats et réponds de manière claire et formatée.`,
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
