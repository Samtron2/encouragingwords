import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface MergeContact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  last_contacted_at: string | null;
  created_at?: string | null;
}

interface Props {
  open: boolean;
  a: MergeContact | null;
  b: MergeContact | null;
  onCancel: () => void;
  onConfirm: (choice: { name: string | null; email: string | null; phone: string | null }) => void;
}

type FieldKey = "name" | "email" | "phone";

function pickDefault(field: FieldKey, a: MergeContact, b: MergeContact): "a" | "b" {
  const av = (a[field] ?? "").trim();
  const bv = (b[field] ?? "").trim();
  if (av && !bv) return "a";
  if (!av && bv) return "b";
  if (field === "name") return av.length >= bv.length ? "a" : "b";
  return "a";
}

export default function MergeContactsDialog({ open, a, b, onCancel, onConfirm }: Props) {
  const fields: FieldKey[] = ["name", "email", "phone"];

  const defaults = useMemo(() => {
    const d: Record<FieldKey, "a" | "b"> = { name: "a", email: "a", phone: "a" };
    if (a && b) fields.forEach((f) => (d[f] = pickDefault(f, a, b)));
    return d;
  }, [a?.id, b?.id]);

  const [choice, setChoice] = useState<Record<FieldKey, "a" | "b">>(defaults);

  // reset when contacts change
  useMemo(() => setChoice(defaults), [defaults]);

  if (!a || !b) return null;

  const labels: Record<FieldKey, string> = { name: "Name", email: "Email", phone: "Phone" };

  const renderField = (f: FieldKey) => {
    const av = (a[f] ?? "").trim();
    const bv = (b[f] ?? "").trim();
    if (!av && !bv) return null;
    const rows: Array<{ side: "a" | "b"; value: string }> = [];
    if (av) rows.push({ side: "a", value: av });
    if (bv && bv !== av) rows.push({ side: "b", value: bv });
    return (
      <div key={f} className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">{labels[f]}</p>
        <div className="space-y-1.5">
          {rows.map((r) => {
            const active = choice[f] === r.side || rows.length === 1;
            return (
              <button
                key={r.side}
                type="button"
                onClick={() => setChoice((c) => ({ ...c, [f]: r.side }))}
                className={`w-full min-h-[44px] flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  active
                    ? "border-accent bg-accent/10"
                    : "border-border bg-card hover:bg-muted/50"
                }`}
              >
                <span
                  className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                    active ? "border-accent bg-accent" : "border-muted-foreground"
                  }`}
                />
                <span className="truncate text-sm text-foreground">{r.value}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleConfirm = () => {
    const pick = (f: FieldKey): string | null => {
      const src = choice[f] === "a" ? a : b;
      const val = (src[f] ?? "").trim();
      return val || null;
    };
    onConfirm({ name: pick("name"), email: pick("email"), phone: pick("phone") });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-primary">
            Merge into one contact
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {fields.map(renderField)}
          <p className="text-xs text-muted-foreground pt-1">
            Their message history comes along. This can't be undone.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onCancel} className="rounded-full">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
