import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isLikelyValidEmail } from "@/lib/utils";

export default function GiveGiftCard({ defaultSignOff }: { defaultSignOff?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [signOff, setSignOff] = useState(defaultSignOff || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!signOff && defaultSignOff) setSignOff(defaultSignOff);
  }, [defaultSignOff]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!name.trim() || !signOff.trim()) {
      toast.error("Please add their name and how you'd like to sign it.");
      return;
    }
    if (!isLikelyValidEmail(email)) {
      toast.error("That email looks incomplete — double-check it (missing .com or .net?)");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("create-gift-checkout", {
      body: {
        recipient_name: name.trim(),
        recipient_email: email.trim(),
        note: note.trim() || undefined,
        purchaser_name: signOff.trim(),
      },
    });
    if (error || !data?.url) {
      console.error("create-gift-checkout failed", error, data);
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }
    window.location.href = data.url;
  };

  return (
    <section className="mb-8">
      <div className="rounded-2xl bg-card p-6 shadow-card space-y-4">
        <div>
          <p className="text-base font-medium">Give a year</p>
          <p className="text-[15px] text-muted-foreground leading-relaxed mt-1">
            Send someone a full year of Encouraging Words. $19.95, one time. It doesn't renew.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="w-full h-12 rounded-full border-accent/40 font-bold gap-2"
        >
          <Gift className="h-4 w-4" />
          Give a year
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
        <DialogContent className="bg-card border border-accent/30 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-accent">Give a year</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="gift-name">Their name</Label>
              <Input id="gift-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gift-email">Their email</Label>
              <Input id="gift-email" type="email" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gift-note">A note (optional)</Label>
              <Textarea id="gift-note" value={note} maxLength={300} rows={3} onChange={(e) => setNote(e.target.value)} />
              <p className="text-xs text-muted-foreground text-right">{note.length}/300</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gift-signoff">Sign it as</Label>
              <Input id="gift-signoff" value={signOff} maxLength={80} onChange={(e) => setSignOff(e.target.value)} />
            </div>
            <Button
              onClick={submit}
              disabled={loading}
              className="w-full h-12 rounded-full bg-accent text-accent-foreground font-bold hover:bg-accent/90 gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue to payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
