import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDailyVisuals } from "@/hooks/useDailyVisuals";
import { useComposerDraft } from "@/hooks/useComposerDraft";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Mail, MessageSquare, Check, User, AlertCircle, X } from "lucide-react";
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
  const { visuals: dailyVisuals, loading: visualsLoading } = useDailyVisuals();
  const { initialDraft, draftRestored, setDraftRestored, saveDraft, clearDraft } = useComposerDraft();

  const [recipientInput, setRecipientInput] = useState(prefill?.name || initialDraft?.recipientInput || "");
  const [recipientName, setRecipientName] = useState(prefill?.name || initialDraft?.recipientName || "");
  const [recipientEmail, setRecipientEmail] = useState(prefill?.email || initialDraft?.recipientEmail || "");
  const [recipientPhone, setRecipientPhone] = useState(prefill?.phone || initialDraft?.recipientPhone || "");
  const [suggestions, setSuggestions] = useState<Recipient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [message, setMessage] = useState(initialDraft?.message || "");
  const [selectedVisual, setSelectedVisual] = useState<number | null>(null);
  const [selectedVisualId, setSelectedVisualId] = useState<string | null>(initialDraft?.selectedVisualId || null);
  const [visualIndex, setVisualIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [chipApi, setChipApi] = useState<CarouselApi>();
  const [chipIndex, setChipIndex] = useState(0);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [isTouchDevice] = useState(() => typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mark draft as restored on mount
  useEffect(() => {
    if (initialDraft && !prefill) {
      setDraftRestored(true);
    }
  }, []);

  // Restore selectedVisual index from ID once visuals load
  useEffect(() => {
    if (selectedVisualId && dailyVisuals.length > 0 && selectedVisual === null) {
      const idx = dailyVisuals.findIndex((v) => v.id === selectedVisualId);
      if (idx >= 0) setSelectedVisual(idx);
    }
  }, [dailyVisuals, selectedVisualId]);

  // Persist draft on changes
  useEffect(() => {
    saveDraft({
      recipientInput,
      recipientName,
      recipientEmail,
      recipientPhone,
      message,
      selectedVisualId: selectedVisual !== null ? dailyVisuals[selectedVisual]?.id || null : null,
      selectedPrompt: PROMPT_SUGGESTIONS.includes(message) ? message : null,
    });
  }, [recipientInput, recipientName, recipientEmail, recipientPhone, message, selectedVisual, dailyVisuals]);

  const handleClearDraft = () => {
    clearDraft();
    setRecipientInput("");
    setRecipientName("");
    setRecipientEmail("");
    setRecipientPhone("");
    setMessage("");
    setSelectedVisual(null);
    setSelectedVisualId(null);
    setSendError(false);
  };

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

      const visual = selectedVisual !== null ? dailyVisuals[selectedVisual] : null;
      const isEmoji = visual?.image_url?.startsWith("emoji:");
      const emojiChar = isEmoji ? visual.image_url!.slice(6) : undefined;
      const imageUrl = !isEmoji ? visual?.image_url || undefined : undefined;

      if (method === "email") {
        const sendResult = await supabase.functions.invoke("send-email", {
          body: {
            recipientEmail,
            recipientName: recipientName || undefined,
            message: message.trim(),
            visualImageUrl: imageUrl,
            visualEmoji: emojiChar,
          },
        });

        const status = sendResult.error ? "failed" : "sent";

        await supabase.from("messages").insert({
          user_id: user.id,
          recipient_id: recipientRow?.id || null,
          message_text: message.trim(),
          visual_id: visual?.id || null,
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
        let smsText = message.trim();
        if (emojiChar) {
          smsText = `${emojiChar} ${smsText}`;
        } else if (imageUrl) {
          smsText = `${smsText}\n${imageUrl}`;
        }
        const smsBody = encodeURIComponent(smsText);
        const smsUrl = `sms:${recipientPhone}?body=${smsBody}`;

        await supabase.from("messages").insert({
          user_id: user.id,
          recipient_id: recipientRow?.id || null,
          message_text: message.trim(),
          visual_id: visual?.id || null,
          delivery_method: "sms_native",
          status: "initiated",
        });

        window.open(smsUrl, "_self");
      }

      clearDraft();
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

  const onCarouselSelect = useCallback(() => {
    if (!carouselApi) return;
    setVisualIndex(carouselApi.selectedScrollSnap());
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi) return;
    onCarouselSelect();
    carouselApi.on("select", onCarouselSelect);
    return () => { carouselApi.off("select", onCarouselSelect); };
  }, [carouselApi, onCarouselSelect]);

  const onChipSelect = useCallback(() => {
    if (!chipApi) return;
    setChipIndex(chipApi.selectedScrollSnap());
  }, [chipApi]);

  useEffect(() => {
    if (!chipApi) return;
    onChipSelect();
    chipApi.on("select", onChipSelect);
    return () => { chipApi.off("select", onChipSelect); };
  }, [chipApi, onChipSelect]);

  const toggleVisualSelection = () => {
    setSelectedVisual(selectedVisual === visualIndex ? null : visualIndex);
  };

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 animate-fade-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15 mb-6">
          <Check className="h-10 w-10 text-accent" />
        </div>
        <h2 className="font-display text-4xl font-bold text-primary">Your words are on their way</h2>
        <p className="mt-3 text-center text-muted-foreground max-w-xs leading-relaxed text-lg">
          You just made someone's day a little brighter.
        </p>
        <Button
          className="mt-8 rounded-full bg-accent text-accent-foreground font-bold px-8 h-16 text-lg shadow-glow hover:bg-accent/90"
          onClick={onBack}
        >
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 pb-24 pt-6 animate-fade-in overflow-x-hidden max-w-full">
      <div className="w-full max-w-[480px] mx-auto text-center">
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

          <div className="mt-3">
            <Carousel
              opts={{ align: "center", loop: false, startIndex: Math.floor(PROMPT_SUGGESTIONS.length / 2) }}
              setApi={setChipApi}
              className="w-full"
            >
              <CarouselContent>
                {PROMPT_SUGGESTIONS.map((prompt) => {
                  const isSelected = message === prompt;
                  return (
                    <CarouselItem key={prompt} className="basis-auto max-w-[70%] flex justify-center pl-2">
                      <button
                        onClick={() => setMessage(prompt)}
                        className={`rounded-full border px-5 py-3 text-lg font-medium transition-colors whitespace-nowrap ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-primary border-primary/30 hover:bg-primary/5"
                        }`}
                      >
                        {prompt}
                      </button>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>
          </div>

          {/* Visual carousel */}
          <div className="mt-6">
            <p className="text-lg text-muted-foreground mb-3">Choose a visual (optional)</p>
            {visualsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : dailyVisuals.length === 0 ? (
              <p className="text-base text-muted-foreground text-center py-6">No visuals available today.</p>
            ) : (
              <div className="relative">
                <Carousel
                  opts={{ align: "center", loop: false, startIndex: Math.floor(dailyVisuals.length / 2) }}
                  setApi={setCarouselApi}
                  className="w-full"
                >
                  <CarouselContent>
                    {dailyVisuals.map((visual, idx) => (
                      <CarouselItem key={visual.id} className="basis-[65%] min-w-0 flex flex-col items-center pl-3">
                        <button
                          onClick={() => setSelectedVisual(selectedVisual === idx ? null : idx)}
                          className="flex flex-col items-center gap-2 transition-all"
                        >
                          {visual.image_url?.startsWith("emoji:") ? (
                            <div
                              className={`h-[200px] w-[200px] rounded-2xl flex items-center justify-center transition-all shadow-card bg-[#F5F0E8] ${
                                selectedVisual === idx
                                  ? "ring-2 ring-accent ring-offset-2 ring-offset-background shadow-elevated"
                                  : ""
                              }`}
                            >
                              <span className="text-[128px] leading-none">{visual.image_url.slice(6)}</span>
                            </div>
                          ) : visual.image_url ? (
                            <img
                              src={visual.image_url}
                              alt={visual.name}
                              className={`h-[200px] w-[200px] rounded-2xl object-cover transition-all shadow-card ${
                                selectedVisual === idx
                                  ? "ring-2 ring-accent ring-offset-2 ring-offset-background shadow-elevated"
                                  : ""
                              }`}
                            />
                          ) : (
                            <div
                              className={`h-[200px] w-[200px] rounded-2xl transition-all shadow-card bg-secondary ${
                                selectedVisual === idx
                                  ? "ring-2 ring-accent ring-offset-2 ring-offset-background shadow-elevated"
                                  : ""
                              }`}
                            />
                          )}
                          <span className="text-[15px] text-muted-foreground">{visual.name}</span>
                        </button>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>
            )}
            <p className="font-display italic text-sm text-muted-foreground text-center mt-3">
              Today's visuals · refreshes at midnight
            </p>
          </div>
        </section>

        {/* STEP 3 — HOW */}
        <section>
          <label className="text-lg font-medium text-muted-foreground mb-3 block">
            How should we send it?
          </label>
          <div className="flex gap-3 w-full">
            <Button
              onClick={() => handleSend("email")}
              disabled={!canSendEmail || !message.trim() || sending}
              className="gap-2 h-16 font-bold text-lg font-body bg-accent text-white shadow-glow hover:bg-accent/90 disabled:opacity-40 min-w-0"
              style={{ flex: "1 1 45%", borderRadius: "999px" }}
            >
              <Mail className="h-5 w-5 shrink-0" />
              <span className="truncate">{sending ? "Sending…" : "Send by email"}</span>
            </Button>
            {isTouchDevice && (
              <Button
                onClick={() => handleSend("sms")}
                disabled={!canSendSms || !message.trim() || sending}
                className="gap-2 h-16 font-bold text-lg font-body text-white hover:opacity-90 disabled:opacity-40 min-w-0"
                style={{ flex: "1 1 45%", borderRadius: "999px", backgroundColor: "hsl(var(--primary))" }}
              >
                <MessageSquare className="h-5 w-5 shrink-0" />
                <span className="truncate">{sending ? "Sending…" : "Send by text"}</span>
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
