import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  X,
  Loader2,
  Database,
  BarChart3,
  HelpCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { getSupabaseClient } from "../providers/supabase/supabase";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  isLoading?: boolean;
}

const SUGGESTIONS = [
  {
    icon: Database,
    label: "Combien de leads ce mois ?",
    message: "Combien de nouveaux leads avons-nous reçu ce mois-ci ?",
  },
  {
    icon: BarChart3,
    label: "Répartition par formation",
    message:
      "Quelle est la répartition des leads par formation souhaitée ? Montre-moi un tableau.",
  },
  {
    icon: BarChart3,
    label: "Taux de conversion pipeline",
    message:
      "Quel est le taux de conversion à chaque étape du pipeline ? Combien de leads passent de Nouveau lead à Inscrit ?",
  },
  {
    icon: HelpCircle,
    label: "Comment ajouter un contact ?",
    message: "Comment ajouter un nouveau contact dans le CRM ?",
  },
];

function formatMarkdown(text: string): React.ReactElement[] {
  const parts = text.split(/(```[\s\S]*?```|\*\*.*?\*\*|\n)/g);
  const elements: React.ReactElement[] = [];

  parts.forEach((part, i) => {
    if (part.startsWith("```")) {
      const content = part.replace(/```\w*\n?/, "").replace(/```$/, "");
      elements.push(
        <pre
          key={i}
          className="bg-muted rounded-md p-2 text-xs overflow-x-auto my-1 font-mono"
        >
          {content}
        </pre>,
      );
    } else if (part.startsWith("**") && part.endsWith("**")) {
      elements.push(
        <strong key={i}>{part.slice(2, -2)}</strong>,
      );
    } else if (part === "\n") {
      elements.push(<br key={i} />);
    } else if (part.startsWith("| ")) {
      // Table row
      const cells = part
        .split("|")
        .filter((c) => c.trim())
        .map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) return; // separator row
      elements.push(
        <div key={i} className="flex gap-2 text-xs py-0.5 font-mono">
          {cells.map((cell, j) => (
            <span key={j} className="flex-1 truncate">
              {cell}
            </span>
          ))}
        </div>,
      );
    } else {
      elements.push(<span key={i}>{part}</span>);
    }
  });

  return elements;
}

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMessage: ChatMessage = { role: "user", content: text };
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: "",
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInput("");
      setIsStreaming(true);

      try {
        const chatHistory: ChatMessage[] = [
          ...messages.filter((m) => !m.isLoading),
          userMessage,
        ].map(({ role, content }) => ({ role, content }));

        // Call the Supabase edge function (handles Ollama + SQL server-side)
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.functions.invoke(
          "ai-assistant",
          { body: { messages: chatHistory, stream: false } },
        );

        if (error) throw new Error(error.message);
        const aiContent: string = data?.content ?? "";

        setMessages((prev) =>
          prev.map((m, idx) =>
            idx === prev.length - 1
              ? { ...m, content: aiContent, isLoading: false }
              : m,
          ),
        );
      } catch (e) {
        setMessages((prev) =>
          prev.map((m, idx) =>
            idx === prev.length - 1
              ? {
                  ...m,
                  content: `❌ Erreur de connexion à l'IA: ${e}`,
                  isLoading: false,
                }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, messages],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Floating button — on mobile sits above the bottom nav bar (h-14 = 56px) */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>

      {/* Chat panel */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-110 p-0 flex flex-col"
        >
          <SheetHeader className="p-4 pb-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <SheetTitle className="text-base">Assistant IA AIBS</SheetTitle>
                <Badge variant="secondary" className="text-xs">
                  minimax
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={clearChat}
                    title="Effacer la conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-1 mt-1">
              <Badge
                variant="outline"
                className="text-[10px] gap-1 text-muted-foreground"
              >
                <Database className="h-3 w-3" /> DB Agent
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] gap-1 text-muted-foreground"
              >
                <BarChart3 className="h-3 w-3" /> Analyste
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] gap-1 text-muted-foreground"
              >
                <HelpCircle className="h-3 w-3" /> Guide
              </Badge>
            </div>
          </SheetHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center pt-4">
                  Comment puis-je vous aider ?
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s.message)}
                      className="flex items-center gap-2 text-left text-sm p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <s.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages
              .filter((m) => m.role !== "system")
              .map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground">
                          Réflexion...
                        </span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap wrap-break-word">
                        {formatMarkdown(message.content)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question..."
                className="flex-1 resize-none rounded-lg border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-10 max-h-30"
                rows={1}
                disabled={isStreaming}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming}
                size="icon"
                className="h-10 w-10 shrink-0"
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
