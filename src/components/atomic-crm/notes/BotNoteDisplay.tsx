import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";

/**
 * Parses a bot-formatted note like:
 *   [BOT] Formation: X | Issue: Y | Détails: Z
 * Returns null if not a bot note.
 */
export function parseBotNote(text: string | null | undefined): {
  formation?: string;
  issue?: string;
  details?: string;
  raw: string;
} | null {
  if (!text) return null;
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("[BOT]")) return null;
  const body = trimmed.slice(5).trim();
  const parts: Record<string, string> = {};
  for (const chunk of body.split("|")) {
    const piece = chunk.trim();
    const colonIdx = piece.indexOf(":");
    if (colonIdx > 0) {
      const key = piece.slice(0, colonIdx).trim().toLowerCase();
      const value = piece.slice(colonIdx + 1).trim();
      parts[key] = value;
    }
  }
  return {
    formation: parts.formation,
    issue: parts.issue,
    details: parts["détails"] ?? parts.details ?? parts["resume"] ?? parts["résumé"],
    raw: body,
  };
}

/**
 * Pretty display for a parsed [BOT] note: formation badge + status badge + details text.
 */
export const BotNoteDisplay = ({ text }: { text: string }) => {
  const parsed = parseBotNote(text);
  if (!parsed) return null;

  return (
    <div className="rounded-md border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700"
        >
          <Bot className="w-3 h-3 mr-1" />
          Bot WhatsApp
        </Badge>
        {parsed.formation && (
          <Badge variant="secondary" className="font-normal">
            {parsed.formation}
          </Badge>
        )}
        {parsed.issue && (
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {parsed.issue}
          </Badge>
        )}
      </div>
      {parsed.details && (
        <p className="text-sm text-foreground leading-relaxed">
          {parsed.details}
        </p>
      )}
    </div>
  );
};
