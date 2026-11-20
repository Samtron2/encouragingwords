import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ContactChoice {
  name?: string;
  email: string;
  phone: string;
}

interface Props {
  open: boolean;
  name?: string;
  emails: string[];
  phones: string[];
  onCancel: () => void;
  onConfirm: (choice: ContactChoice) => void;
}

const NONE = "__none__";

export default function ContactDetailsChooser({
  open,
  name,
  emails,
  phones,
  onCancel,
  onConfirm,
}: Props) {
  const [selectedEmail, setSelectedEmail] = useState<string>(emails[0] ?? NONE);
  const [selectedPhone, setSelectedPhone] = useState<string>(phones[0] ?? NONE);

  useEffect(() => {
    if (open) {
      setSelectedEmail(emails[0] ?? NONE);
      setSelectedPhone(phones[0] ?? NONE);
    }
  }, [open, emails, phones]);

  const displayName = (name || "this contact").trim();

  const handleConfirm = () => {
    onConfirm({
      name,
      email: selectedEmail === NONE ? "" : selectedEmail,
      phone: selectedPhone === NONE ? "" : selectedPhone,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[85vh] flex flex-col overflow-hidden rounded-2xl p-5 bg-card border-border">
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          <DialogHeader>
            <DialogTitle className="font-display text-xl sm:text-2xl text-primary pr-8 break-words text-balance text-left leading-tight">
              Which details for {displayName}?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {emails.length > 0 && (
              <Group
                label="Email"
                options={emails}
                value={selectedEmail}
                onChange={setSelectedEmail}
              />
            )}
            {phones.length > 0 && (
              <Group
                label="Phone"
                options={phones}
                value={selectedPhone}
                onChange={setSelectedPhone}
              />
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end shrink-0 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="rounded-full w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto"
          >
            Use these
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Group({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const rows = [...options, NONE];
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </p>
      <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
        {rows.map((opt) => {
          const isNone = opt === NONE;
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`flex w-full min-w-0 items-center gap-3 px-4 min-h-[44px] py-2.5 text-left transition-colors ${
                selected ? "bg-accent/10" : "hover:bg-secondary/60"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  selected ? "border-accent" : "border-muted-foreground/40"
                }`}
              >
                {selected && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
              </span>
              <span
                className={`flex-1 min-w-0 [overflow-wrap:anywhere] text-base ${
                  isNone ? "italic text-muted-foreground" : "text-foreground"
                }`}
              >
                {isNone ? "None" : opt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
