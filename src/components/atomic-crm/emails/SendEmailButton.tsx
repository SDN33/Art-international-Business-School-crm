import { useState } from "react";
import { useNotify, useRecordContext } from "ra-core";
import { useDataProvider } from "ra-core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send } from "lucide-react";
import type { Contact } from "../types";
import type { CrmDataProvider } from "../providers/types";

type SendEmailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toEmail?: string;
  toName?: string;
  contactId?: string;
};

export const SendEmailDialog = ({
  open,
  onOpenChange,
  toEmail = "",
  toName = "",
  contactId,
}: SendEmailDialogProps) => {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!toEmail || !subject || !body) return;
    setSending(true);
    try {
      await dataProvider.sendEmail({
        to: toEmail,
        subject,
        html: body.replace(/\n/g, "<br>"),
        contact_id: contactId,
        first_name: toName.split(" ")[0],
      });
      notify("Email envoyé avec succès", { type: "success" });
      onOpenChange(false);
      setSubject("");
      setBody("");
    } catch {
      notify("Échec de l'envoi de l'email", { type: "error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Envoyer un email
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>À</Label>
            <Input value={toEmail ? `${toName} <${toEmail}>` : ""} disabled />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email-subject">Objet</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet de l'email"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email-body">Message</Label>
            <Textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Bonjour {{prenom}},\n\n...`}
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Utilisez <code>{"{{prenom}}"}</code> pour personnaliser le message.
              Expéditeur : <strong>noreply@artaibs.fr</strong>
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !subject || !body || !toEmail}
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Envoi…" : "Envoyer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const SendEmailButton = ({
  size = "sm",
}: {
  size?: "sm" | "default";
}) => {
  const record = useRecordContext<Contact>();
  const [open, setOpen] = useState(false);

  if (!record) return null;

  const primaryEmail = record.email_jsonb?.[0]?.email ?? "";
  const contactName = `${record.first_name ?? ""} ${record.last_name ?? ""}`.trim();

  if (!primaryEmail) return null;

  return (
    <>
      <Button
        variant="outline"
        size={size}
        onClick={() => setOpen(true)}
        className="gap-1"
      >
        <Mail className="h-4 w-4" />
        Envoyer un email
      </Button>
      <SendEmailDialog
        open={open}
        onOpenChange={setOpen}
        toEmail={primaryEmail}
        toName={contactName}
        contactId={String(record.id)}
      />
    </>
  );
};
