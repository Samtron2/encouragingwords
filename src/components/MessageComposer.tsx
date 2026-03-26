import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Check, User, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const PROMPT_SUGGESTIONS = [
  "Thinking of you",
  "You've got this",
  "So proud of you",
  "You made my day",
  "Just because.",
  "You are enough",
  "Keep shining ✨",
  "I believe in you",
];

const PLACEHOLDER_VISUALS = [
  { label: "Sunrise", color: "hsl(30, 60%, 80%)" },
  { label: "Bloom", color: "hsl(340, 40%, 82%)" },
  { label: "Meadow", color: "hsl(120, 30%, 82%)" },
  { label: "Ocean", color: "hsl(200, 40%, 80%)" },
  { label: "Sunset", color: "hsl(15, 55%, 78%)" },
];

interface Recipient {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface PrefilledRecipient {
  name?: string;
  email?: string;
  phone?: string;
}

interface MessageComposerProps {
  onBack: () => void;
  prefill?: PrefilledRecipient;
}

export default function MessageComposer({ onBack, prefill }: MessageComposerProps) {
  const { user } = useAuth();
  const [recipientInput, setRecipientInput] = useState(prefill?.name || "");
  const [recipientName, setRecipientName] = useState(prefill?.name || "");
  const [recipientEmail, setRecipientEmail] = useState(prefill?.email || "");
  const [recipientPhone, setRecipientPhone] = useState(prefill?.phone || "");
  const [suggestions, setSuggestions] = useState<Recipient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedVisual, setSelectedVisual] = useState<number | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseRecipientInput = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.includes("@")) {
      setRecipientEmail(trimmed);
      setRecipientPhone("");
      setRecipientName("");
    } else if (/^\+?\d[\d\s\-()]{6,}$/.test(trimmed)) {
      setRecipientPhone(trimmed);
      setRecipientEmail("");
      setRecipientName(trimmed);
    } else {
      setRecipientName(trimmed);
      setRecipientEmail("");
      setRecipientPhone("");
    }
  };

  useEffect(() => {
    if (!user || recipientInput.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const q = `%${recipientInput}%`;
      const { data } = await supabase
        .from("recipients")
        .select("id, name, email, phone")
        .eq("user_id", user.id)
        .or(`name.ilike.${q},email.ilike.${q},phone.ilike.${q}`)
        .order("last_contacted_at", { ascending: false, nullsFirst: false })
        .limit(5);

      setSuggestions((data as Recipient[]) || []);
    }, 250);

    return () => clearTimeout(timeout);
  }, [recipientInput, user]);

  const selectSuggestion = (r: Recipient) => {
    setRecipientInput(r.name || r.email || r.phone || "");
    setRecipientName(r.name || "");
    setRecipientEmail(r.email || "");
    setRecipientPhone(r.phone || "");
    setShowSuggestions(false);
  };

  const handleSend = async (method: "email" | "sms") => {
    if (!user || !message.trim()) return;
    setSending(true);
    setSendError(false);

    try {
      // Save recipient to contacts
      const recipientData: Record<string, unknown> = {
        user_id: user.id,
        last_contacted_at: new Date().toISOString(),
      };
      if (recipientName) recipientData.name = recipientName;
      if (recipientEmail) recipientData.email = recipientEmail;
      if (recipientPhone) recipientData.phone = recipientPhone;

      const { data: recipientRow } = await supabase
        .from("recipients")
        .insert([recipientData as { user_id: string; name?: string; email?: string; phone?: string; last_contacted_at?: string }])
        .select("id")
        .single();

      const visual = selectedVisual !== null ? PLACEHOLDER_VISUALS[selectedVisual] : null;

      if (method === "email") {
        // Send via edge function
        const sendResult = await supabase.functions.invoke("send-email", {
          body: {
            recipientEmail,
            recipientName: recipientName || undefined,
            message: message.trim(),
            visualLabel: visual?.label,
            visualColor: visual?.color,
          },
        });

        const status = sendResult.error ? "failed" : "sent";

        await supabase.from("messages").insert({
          user_id: user.id,
          recipient_id: recipientRow?.id || null,
          message_text: message.trim(),
          visual_id: visual?.label || null,
          delivery_method: "email",
          status,
        });

        if (sendResult.error || sendResult.data?.error) {
          console.error("Send failed:", sendResult.error || sendResult.data?.error);
          setSendError(true);
          setSending(false);
          return;
        }
      } else {
        // Native SMS deep link
        const smsBody = encodeURIComponent(message.trim());
        const smsUrl = `sms:${recipientPhone}?body=${smsBody}`;

        // Log as initiated since we can't confirm delivery
        await supabase.from("messages").insert({
          user_id: user.id,
          recipient_id: recipientRow?.id || null,
          message_text: message.trim(),
          visual_id: visual?.label || null,
          delivery_method: "sms_native",
          status: "initiated",
        });

        window.open(smsUrl, "_self");
      }

      setSending(false);
      setSent(true);
    } catch (err) {
      console.error("Send error:", err);
      setSendError(true);
      setSending(false);
    }
  };

  const canSendEmail = !!recipientEmail;
  const canSendSms = !!recipientPhone;

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 animate-fade-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
          <Check className="h-10 w-10 text-primary" />
        </div>
        <h2 className="font-display text-3xl font-semibold text-foreground">Your words are on their way</h2>
        <p className="mt-3 text-center text-muted-foreground max-w-xs leading-relaxed">
          You just made someone's day a little brighter.
        </p>
        <Button className="mt-8 shadow-glow" onClick={onBack}>
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-6 pb-24 pt-6 animate-fade-in">
      <h1 className="font-display text-2xl font-semibold mb-8">Send some warmth</h1>

      {sendError && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
        </div>
      )}

      {/* STEP 1 — WHO */}
      <section className="mb-8">
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          Who is this for?
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Name, email, or phone number"
            value={recipientInput}
            onChange={(e) => {
              setRecipientInput(e.target.value);
              parseRecipientInput(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="pl-10"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-background shadow-soft overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/60 transition-colors"
                  onMouseDown={() => selectSuggestion(s)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground text-xs font-semibold">
                    {(s.name || s.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    {s.name && <p className="text-sm font-medium truncate">{s.name}</p>}
                    <p className="text-xs text-muted-foreground truncate">{s.email || s.phone}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* STEP 2 — WHAT */}
      <section className="mb-8">
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          Your message
        </label>
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => {
              if (e.target.value.length <= 160) setMessage(e.target.value);
            }}
            placeholder="Write something kind…"
            rows={3}
            className="flex w-full rounded-lg border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none font-body"
          />
          <span className="absolute bottom-3 right-3 text-xs text-muted-foreground">
            {message.length}/160
          </span>
        </div>

        <div className="mt-3 -mx-6 px-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {PROMPT_SUGGESTIONS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => setMessage(prompt)}
                className="shrink-0 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm text-foreground hover:bg-secondary transition-colors whitespace-nowrap"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-sm text-muted-foreground mb-2">Choose a visual (optional)</p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            {PLACEHOLDER_VISUALS.map((v, i) => (
              <button
                key={v.label}
                onClick={() => setSelectedVisual(selectedVisual === i ? null : i)}
                className={`shrink-0 flex flex-col items-center gap-1.5 transition-all ${
                  selectedVisual === i ? "scale-105" : ""
                }`}
              >
                <div
                  className={`h-20 w-20 rounded-xl shadow-soft transition-all ${
                    selectedVisual === i
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : ""
                  }`}
                  style={{ backgroundColor: v.color }}
                />
                <span className="text-xs text-muted-foreground">{v.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* STEP 3 — HOW */}
      <section>
        <label className="text-sm font-medium text-muted-foreground mb-3 block">
          How should we send it?
        </label>
        <div className="flex gap-3">
          <Button
            onClick={() => handleSend("email")}
            disabled={!canSendEmail || !message.trim() || sending}
            className="flex-1 gap-2 shadow-glow"
            variant={canSendEmail ? "default" : "secondary"}
          >
            <Mail className="h-4 w-4" />
            {sending ? "Sending…" : "Send by email"}
          </Button>
          <Button
            onClick={() => handleSend("sms")}
            disabled={!canSendSms || !message.trim() || sending}
            className="flex-1 gap-2"
            variant={canSendSms ? "default" : "secondary"}
          >
            <MessageSquare className="h-4 w-4" />
            {sending ? "Sending…" : "Send by text"}
          </Button>
        </div>
      </section>
    </div>
  );
}
