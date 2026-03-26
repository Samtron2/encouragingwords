import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Check, User, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [visualIndex, setVisualIndex] = useState(0);
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
        const smsBody = encodeURIComponent(message.trim());
        const smsUrl = `sms:${recipientPhone}?body=${smsBody}`;

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

  const prevVisual = () => {
    setVisualIndex((i) => (i === 0 ? PLACEHOLDER_VISUALS.length - 1 : i - 1));
  };

  const nextVisual = () => {
    setVisualIndex((i) => (i === PLACEHOLDER_VISUALS.length - 1 ? 0 : i + 1));
  };

  const toggleVisualSelection = () => {
    setSelectedVisual(selectedVisual === visualIndex ? null : visualIndex);
  };

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 animate-fade-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15 mb-6">
          <Check className="h-10 w-10 text-accent" />
        </div>
        <h2 className="font-display text-3xl font-bold text-primary">Your words are on their way</h2>
        <p className="mt-3 text-center text-muted-foreground max-w-xs leading-relaxed text-base">
          You just made someone's day a little brighter.
        </p>
        <Button
          className="mt-8 rounded-full bg-accent text-accent-foreground font-bold px-8 py-5 shadow-glow hover:bg-accent/90"
          onClick={onBack}
        >
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 pb-24 pt-6 animate-fade-in">
      <div className="w-full max-w-[480px]">
        <h1 className="font-display text-4xl font-bold text-primary mb-8">Send a word</h1>

        {sendError && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-base text-destructive">Something went wrong. Please try again.</p>
          </div>
        )}

        {/* STEP 1 — WHO */}
        <section className="mb-8">
          <label className="text-lg font-medium text-muted-foreground mb-2 block">
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
              className="pl-10 text-lg py-5"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/60 transition-colors"
                    onMouseDown={() => selectSuggestion(s)}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground text-[15px] font-semibold">
                      {(s.name || s.email || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      {s.name && <p className="text-base font-medium truncate">{s.name}</p>}
                      <p className="text-[15px] text-muted-foreground truncate">{s.email || s.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* STEP 2 — WHAT */}
        <section className="mb-8">
          <label className="text-lg font-medium text-muted-foreground mb-2 block">
            Your message
          </label>
          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => {
                if (e.target.value.length <= 160) setMessage(e.target.value);
              }}
              placeholder="Write something kind…"
              rows={4}
              className="flex w-full rounded-2xl border border-input bg-card px-5 py-5 text-lg ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none font-body shadow-card leading-relaxed"
            />
            <span className="absolute bottom-3 right-4 text-[15px] text-muted-foreground">
              {message.length}/160
            </span>
          </div>

          <div className="mt-3 -mx-6 px-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {PROMPT_SUGGESTIONS.map((prompt) => {
                const isSelected = message === prompt;
                return (
                  <button
                    key={prompt}
                    onClick={() => setMessage(prompt)}
                    className={`shrink-0 rounded-full border px-5 py-3 text-lg font-medium transition-colors whitespace-nowrap ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-primary border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    {prompt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visual carousel */}
          <div className="mt-6">
            <p className="text-lg text-muted-foreground mb-3">Choose a visual (optional)</p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={prevVisual}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card shadow-card text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={toggleVisualSelection}
                className="flex flex-col items-center gap-2 transition-all"
              >
                <div
                  className={`h-[200px] w-[200px] rounded-2xl transition-all shadow-card ${
                    selectedVisual === visualIndex
                      ? "ring-2 ring-accent ring-offset-2 ring-offset-background shadow-elevated"
                      : ""
                  }`}
                  style={{ backgroundColor: PLACEHOLDER_VISUALS[visualIndex].color }}
                />
                <span className="text-[15px] text-muted-foreground">{PLACEHOLDER_VISUALS[visualIndex].label}</span>
              </button>
              <button
                onClick={nextVisual}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card shadow-card text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        {/* STEP 3 — HOW */}
        <section>
          <label className="text-lg font-medium text-muted-foreground mb-3 block">
            How should we send it?
          </label>
          <div className="flex gap-3">
            <Button
              onClick={() => handleSend("email")}
              disabled={!canSendEmail || !message.trim() || sending}
              className="flex-1 gap-2 rounded-full h-16 font-bold text-lg bg-accent text-accent-foreground shadow-glow hover:bg-accent/90 disabled:opacity-40"
            >
              <Mail className="h-5 w-5" />
              {sending ? "Sending…" : "Send by email"}
            </Button>
            <Button
              onClick={() => handleSend("sms")}
              disabled={!canSendSms || !message.trim() || sending}
              className="sms-only flex-1 gap-2 rounded-full h-16 font-bold text-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              <MessageSquare className="h-5 w-5" />
              {sending ? "Sending…" : "Send by text"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
