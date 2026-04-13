import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDailyVisuals } from "@/hooks/useDailyVisuals";
import { useComposerDraft } from "@/hooks/useComposerDraft";
import { useOccasionVisuals, SPECIAL_OCCASIONS, type SpecialOccasion } from "@/hooks/useOccasionVisuals";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Mail, MessageSquare, Check, User, AlertCircle, Pencil, Camera, X } from "lucide-react";
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
  nudge_dismissed: boolean;
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
  const { initialDraft, saveDraft, clearDraft } = useComposerDraft();

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
  const contactInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selfieSelected, setSelfieSelected] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [nudgeField, setNudgeField] = useState<"email" | "phone" | null>(null);
  const [nudgeInputVisible, setNudgeInputVisible] = useState(false);
  const [nudgeValue, setNudgeValue] = useState("");
  const [selectedOccasion, setSelectedOccasion] = useState<SpecialOccasion | null>(null);
  const { visuals: occasionVisuals, loading: occasionLoading } = useOccasionVisuals(selectedOccasion);
  const activeVisuals = selectedOccasion ? occasionVisuals : dailyVisuals;
  const activeVisualsLoading = selectedOccasion ? occasionLoading : visualsLoading;

  // Two-step flow state
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [contactInput, setContactInput] = useState("");

  // If prefill has email/phone, start with name confirmed
  useEffect(() => {
    if (prefill?.name && (prefill?.email || prefill?.phone)) {
      setNameConfirmed(true);
    }
  }, []);

  // If draft had contact info, restore confirmed state
  useEffect(() => {
    if (initialDraft?.recipientName && (initialDraft?.recipientEmail || initialDraft?.recipientPhone)) {
      setNameConfirmed(true);
      setContactInput(initialDraft.recipientEmail || initialDraft.recipientPhone || "");
    }
  }, []);

  // Restore selectedVisual index from ID once visuals load
  useEffect(() => {
    if (selectedVisualId && activeVisuals.length > 0 && selectedVisual === null) {
      const idx = activeVisuals.findIndex((v) => v.id === selectedVisualId);
      if (idx >= 0) setSelectedVisual(idx);
    }
  }, [activeVisuals, selectedVisualId]);

  // Persist draft on changes
  useEffect(() => {
    saveDraft({
      recipientInput,
      recipientName,
      recipientEmail,
      recipientPhone,
      message,
      selectedVisualId: selectedVisual !== null ? activeVisuals[selectedVisual]?.id || null : null,
      selectedPrompt: PROMPT_SUGGESTIONS.includes(message) ? message : null,
    });
  }, [recipientInput, recipientName, recipientEmail, recipientPhone, message, selectedVisual, activeVisuals]);

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
    setNameConfirmed(false);
    setContactInput("");
    setSelfiePreview(null);
    setSelfieSelected(false);
    setSelectedRecipient(null);
    setNudgeField(null);
    setNudgeInputVisible(false);
    setNudgeValue("");
  };

  // Parse the contact detail input (Step 2 only)
  const parseContactInput = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.includes("@")) {
      setRecipientEmail(trimmed);
      setRecipientPhone("");
    } else if (/^\+?\d[\d\s\-()]{6,}$/.test(trimmed)) {
      setRecipientPhone(trimmed);
      setRecipientEmail("");
    } else {
      // Not yet valid — clear both
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
        .select("id, name, email, phone, nudge_dismissed")
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
    setRecipientPhone(r.phone || "");
    setShowSuggestions(false);
    setSelectedRecipient(r);
    setNudgeInputVisible(false);
    setNudgeValue("");
    setNameConfirmed(true);
    setContactInput(r.email || r.phone || "");
    // Explicitly set email so canSendEmail activates
    if (r.email) {
      setRecipientEmail(r.email);
    } else {
      setRecipientEmail("");
    }

    // Determine if nudge is needed
    if (r.nudge_dismissed) {
      setNudgeField(null);
    } else if (r.phone && !r.email) {
      setNudgeField("email");
    } else if (r.email && !r.phone) {
      setNudgeField("phone");
    } else {
      setNudgeField(null);
    }
  };

  const isNameInvalid = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (/^\+?\d[\d\s\-()]{6,}$/.test(trimmed)) return true;
    if (trimmed.includes("@")) return true;
    if (!/[a-zA-Z]/.test(trimmed)) return true;
    return false;
  };

  const nameInputInvalid = isNameInvalid(recipientInput);

  const confirmName = () => {
    const trimmed = recipientInput.trim();
    if (trimmed.length < 2 || isNameInvalid(trimmed)) return;
    setRecipientName(trimmed);
    setNameConfirmed(true);
    setShowSuggestions(false);
    // Focus the contact input after transition
    setTimeout(() => contactInputRef.current?.focus(), 300);
  };

  const editName = () => {
    setNameConfirmed(false);
    setContactInput("");
    setRecipientEmail("");
    setRecipientPhone("");
    setSelectedRecipient(null);
    setNudgeField(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Whether to show "Add [name]" chip — typed ≥2 chars, no suggestion selected, has no exact match, valid name
  const showAddChip = !nameConfirmed
    && recipientInput.trim().length >= 2
    && !selectedRecipient
    && !nameInputInvalid
    && !suggestions.some((s) => s.name?.toLowerCase() === recipientInput.trim().toLowerCase());

  const handleNudgeSave = async () => {
    if (!selectedRecipient || !nudgeValue.trim()) return;
    if (nudgeField === "email") {
      const val = nudgeValue.trim();
      setRecipientEmail(val);
      await supabase.from("recipients").update({ email: val }).eq("id", selectedRecipient.id);
      setSelectedRecipient({ ...selectedRecipient, email: val } as Recipient);
    } else {
      const val = nudgeValue.trim();
      setRecipientPhone(val);
      await supabase.from("recipients").update({ phone: val }).eq("id", selectedRecipient.id);
      setSelectedRecipient({ ...selectedRecipient, phone: val } as Recipient);
    }
    setNudgeField(null);
    setNudgeInputVisible(false);
    setNudgeValue("");
    toast.success("Contact updated!");
  };

  const handleNudgeDismiss = async () => {
    if (!selectedRecipient) return;
    await supabase.from("recipients").update({ nudge_dismissed: true }).eq("id", selectedRecipient.id);
    setNudgeField(null);
    setNudgeInputVisible(false);
  };

  const handleSend = async (method: "email" | "sms") => {
    if (!user || !message.trim()) return;
    setSending(true);
    setSendError(false);

    try {
      const recipientData = {
        user_id: user.id,
        last_contacted_at: new Date().toISOString(),
        ...(recipientName ? { name: recipientName } : {}),
        ...(recipientEmail ? { email: recipientEmail } : {}),
        ...(recipientPhone ? { phone: recipientPhone } : {}),
      };

      // Deduplicate recipients: match on user_id + email, or user_id + phone if no email
      let recipientRow: { id: string } | null = null;

      if (recipientEmail) {
        const { data: existing } = await supabase
          .from("recipients")
          .select("id")
          .eq("user_id", user.id)
          .eq("email", recipientEmail)
          .maybeSingle();

        if (existing) {
          await supabase.from("recipients").update({
            last_contacted_at: new Date().toISOString(),
            ...(recipientName ? { name: recipientName } : {}),
            ...(recipientPhone ? { phone: recipientPhone } : {}),
          }).eq("id", existing.id);
          recipientRow = existing;
        }
      } else if (recipientPhone) {
        const { data: existing } = await supabase
          .from("recipients")
          .select("id")
          .eq("user_id", user.id)
          .eq("phone", recipientPhone)
          .maybeSingle();

        if (existing) {
          await supabase.from("recipients").update({
            last_contacted_at: new Date().toISOString(),
            ...(recipientName ? { name: recipientName } : {}),
          }).eq("id", existing.id);
          recipientRow = existing;
        }
      }

      if (!recipientRow) {
        const { data: inserted } = await supabase
          .from("recipients")
          .insert([recipientData as { user_id: string; name?: string; email?: string; phone?: string; last_contacted_at?: string }])
          .select("id")
          .single();
        recipientRow = inserted;
      }

      const visual = selectedVisual !== null ? activeVisuals[selectedVisual] : null;
      const isEmoji = visual?.image_url?.startsWith("emoji:");
      const emojiChar = isEmoji ? visual.image_url!.slice(6) : undefined;
      let imageUrl = !isEmoji ? visual?.image_url || undefined : undefined;

      // If selfie is selected, use it as the image for email, skip for SMS
      if (selfieSelected && selfiePreview) {
        imageUrl = selfiePreview;
      }

      if (method === "email") {
        const idempotencyKey = `encouraging-${user.id}-${Date.now()}`;

        const senderProfile = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .single();

        const senderName = senderProfile.data?.display_name || null;

        const { data: tokenRow, error: tokenError } = await supabase
          .from("message_tokens")
          .insert({
            sender_name: senderName,
            recipient_name: recipientName || null,
            message_text: message.trim(),
            visual_emoji: selfieSelected ? null : emojiChar || null,
            visual_image_url: (selfieSelected || !imageUrl || imageUrl.startsWith("blob:"))
              ? null
              : imageUrl || null,
          })
          .select("token")
          .single();

        if (tokenError) {
          console.error("Token insert failed:", tokenError);
        }

        console.log("Message URL:", tokenRow?.token
          ? `https://sendencouragingwords.com/m/${tokenRow.token}`
          : "NO TOKEN GENERATED");

        const messageUrl = tokenRow?.token
          ? `https://sendencouragingwords.com/m/${tokenRow.token}`
          : null;

        const sendResult = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "encouraging-message",
            recipientEmail,
            idempotencyKey,
            templateData: {
              recipientName: recipientName || undefined,
              senderName: senderName || undefined,
              message: message.trim(),
              visualImageUrl: selfieSelected && selfiePreview ? selfiePreview : imageUrl,
              visualEmoji: selfieSelected ? undefined : emojiChar,
              messageUrl: messageUrl || undefined,
            },
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
        if (selfieSelected) {
          // Skip image for SMS when selfie is selected — just send text
        } else if (emojiChar) {
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
    if (selectedVisual !== visualIndex) {
      setSelfieSelected(false);
    }
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
      <input
        ref={selfieInputRef}
        type="file"
        accept="image/*"
        
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            setSelfiePreview(url);
            setSelfieSelected(true);
            setSelectedVisual(null);
          }
        }}
      />
      <div className="w-full max-w-[480px] mx-auto text-center">
        <h1 className="font-display text-4xl font-bold text-primary mb-2">Send a word</h1>
        <div className="mb-8" />

        {sendError && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-base text-destructive">Something went wrong. Please try again.</p>
          </div>
        )}

        {/* STEP 1 — WHO (Name) */}
        <section className="mb-8">
          <label className="text-lg font-medium text-muted-foreground mb-2 block">
            Who is this for?
          </label>

          {!nameConfirmed ? (
            <>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Who is this for?"
                  value={recipientInput}
                  onChange={(e) => {
                    setRecipientInput(e.target.value);
                    setRecipientName(e.target.value.trim());
                    setShowSuggestions(true);
                    setSelectedRecipient(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (suggestions.length > 0 && !showAddChip) {
                        selectSuggestion(suggestions[0]);
                      } else {
                        confirmName();
                      }
                    }
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

                {/* Inline validation message */}
                {nameInputInvalid && recipientInput.trim().length >= 2 && (
                  <p className="mt-1.5 text-xs text-destructive">Please enter a name first.</p>
                )}
              </div>

              {/* "Add [name]" chip */}
              {showAddChip && (
                <div className="flex justify-center mt-2">
                  <button
                    onMouseDown={(e) => { e.preventDefault(); confirmName(); }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    Add {recipientInput.trim()}
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Name confirmed — read-only display */
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-lg font-medium text-foreground flex-1 text-left truncate">{recipientName}</span>
              <button
                onClick={editName}
                className="p-1.5 rounded-full hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Edit name"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 2 — Contact detail (slides in after name confirmed, only for new contacts) */}
          {nameConfirmed && !selectedRecipient && (
            <div className="mt-3 animate-fade-in">
              <Input
                ref={contactInputRef}
                placeholder="Email or phone number"
                value={contactInput}
                onChange={(e) => {
                  setContactInput(e.target.value);
                  parseContactInput(e.target.value);
                }}
                className="text-lg py-5"
              />
            </div>
          )}

          {/* Contact nudge (for existing contacts with missing info) */}
          {nudgeField && selectedRecipient && (
            <div className="mt-2 text-left">
              {!nudgeInputVisible ? (
                <p className="text-sm italic text-muted-foreground">
                  {nudgeField === "email"
                    ? `Add ${selectedRecipient.name || "an"}'s email?`
                    : `Add ${selectedRecipient.name || "a"}'s phone number?`}
                  {" "}
                  <button
                    type="button"
                    onClick={() => setNudgeInputVisible(true)}
                    className="underline text-accent hover:text-accent/80 not-italic font-medium"
                  >
                    Add
                  </button>
                  {" · "}
                  <button
                    type="button"
                    onClick={handleNudgeDismiss}
                    className="underline text-muted-foreground/70 hover:text-muted-foreground not-italic"
                  >
                    don't ask again
                  </button>
                </p>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); handleNudgeSave(); }}
                  className="flex items-center gap-2"
                >
                  <Input
                    autoFocus
                    placeholder={nudgeField === "email" ? "Email address" : "Phone number"}
                    value={nudgeValue}
                    onChange={(e) => setNudgeValue(e.target.value)}
                    className="text-sm h-8 rounded-full flex-1"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!nudgeValue.trim()}
                    className="rounded-full h-8 px-4 text-sm bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    Save
                  </Button>
                </form>
              )}
            </div>
          )}
        </section>

        {/* OCCASION SELECTOR */}
        <section className="mb-8">
          <label className="text-lg font-medium text-muted-foreground mb-2 block">
            Any special occasion?
          </label>
          <div className="relative">
            <select
              value={selectedOccasion || ""}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedOccasion(val ? val as SpecialOccasion : null);
                setSelectedVisual(null);
              }}
              className="w-full rounded-2xl border border-input bg-card px-5 py-4 text-lg text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring appearance-none cursor-pointer"
            >
              <option value="">No special occasion</option>
              {SPECIAL_OCCASIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              ▾
            </span>
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
                    <CarouselItem key={prompt} className="basis-auto max-w-[55%] flex justify-center pl-2">
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
            <p className="text-lg text-muted-foreground mb-3">
              {selectedOccasion ? `Visuals for ${selectedOccasion}` : "Choose a visual (optional)"}
            </p>
            {activeVisualsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : activeVisuals.length === 0 ? (
              <p className="text-base text-muted-foreground text-center py-6">No visuals available today.</p>
            ) : (
              <div className="relative">
                <Carousel
                  opts={{ align: "center", loop: false, startIndex: Math.floor(activeVisuals.length / 2) }}
                  setApi={setCarouselApi}
                  className="w-full"
                >
                  <CarouselContent>
                    {(() => {
                      const midIndex = Math.floor(activeVisuals.length / 2);
                      const renderVisual = (visual: typeof activeVisuals[number], idx: number) => {
                        const isSelected = selectedVisual === idx;
                        const selectedClass = isSelected
                          ? "ring-[3px] ring-accent ring-offset-2 ring-offset-background scale-[1.03]"
                          : "";
                        return (
                          <CarouselItem key={visual.id} className="basis-[55%] min-w-0 flex flex-col items-center pl-3">
                            <button
                              onClick={() => { setSelectedVisual(isSelected ? null : idx); if (!isSelected) setSelfieSelected(false); }}
                              className="flex flex-col items-center gap-2 transition-all"
                            >
                              {visual.image_url?.startsWith("emoji:") ? (
                                <div
                                  className={`h-[240px] w-[240px] rounded-[16px] flex items-center justify-center transition-all visual-tile-emoji ${selectedClass}`}
                                >
                                  <span className="text-[100px] leading-none">{visual.image_url.slice(6)}</span>
                                </div>
                              ) : visual.image_url ? (
                                <img
                                  src={visual.image_url}
                                  alt={visual.name}
                                  className={`h-[240px] w-[240px] rounded-[16px] object-cover transition-all ${selectedClass}`}
                                />
                              ) : (
                                <div
                                  className={`h-[240px] w-[240px] rounded-[16px] transition-all bg-secondary ${selectedClass}`}
                                />
                              )}
                              <span className="text-[15px] text-muted-foreground">{visual.name}</span>
                            </button>
                          </CarouselItem>
                        );
                      };
                      return (
                        <>
                          {activeVisuals.slice(0, midIndex).map((v, i) => renderVisual(v, i))}
                          {/* Selfie / photo slot */}
                          <CarouselItem className="basis-[55%] min-w-0 flex flex-col items-center pl-3">
                            {!selfiePreview ? (
                              <button
                                onClick={() => selfieInputRef.current?.click()}
                                className="flex flex-col items-center gap-2"
                              >
                                <div className="h-[240px] w-[240px] rounded-[16px] border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 transition-all hover:border-muted-foreground/50">
                                  <Camera className="h-10 w-10 text-muted-foreground/50" />
                                  <span className="text-sm text-muted-foreground/60">Add a photo</span>
                                </div>
                              </button>
                            ) : (
                              <div className="relative">
                                <button
                                  onClick={() => {
                                    setSelfieSelected(!selfieSelected);
                                    if (!selfieSelected) setSelectedVisual(null);
                                  }}
                                  className="flex flex-col items-center gap-2 transition-all"
                                >
                                  <img
                                    src={selfiePreview}
                                    alt="Your photo"
                                    className={`h-[240px] w-[240px] rounded-[16px] object-cover transition-all ${
                                      selfieSelected
                                        ? "ring-[3px] ring-accent ring-offset-2 ring-offset-background scale-[1.03]"
                                        : ""
                                    }`}
                                  />
                                  <span className="text-[15px] text-muted-foreground">Your photo</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelfiePreview(null);
                                    setSelfieSelected(false);
                                  }}
                                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-background transition-colors"
                                  aria-label="Remove photo"
                                >
                                  <X className="h-4 w-4 text-foreground" />
                                </button>
                              </div>
                            )}
                          </CarouselItem>
                          {activeVisuals.slice(midIndex).map((v, i) => renderVisual(v, midIndex + i))}
                        </>
                      );
                    })()}
                  </CarouselContent>
                </Carousel>
              </div>
            )}
            <p className="font-display italic text-sm text-muted-foreground text-center mt-3">
              {selectedOccasion ? `Showing visuals for ${selectedOccasion}` : "Today's visuals · refreshes at midnight"}
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
              <span className="truncate">{sending ? "Sending…" : "Email"}</span>
            </Button>
            <Button
              onClick={() => handleSend("sms")}
              disabled={!canSendSms || !message.trim() || sending}
              className="gap-2 h-16 font-bold text-lg font-body text-white hover:opacity-90 disabled:opacity-40 min-w-0"
              style={{ flex: "1 1 45%", borderRadius: "999px", backgroundColor: "hsl(var(--primary))" }}
            >
              <MessageSquare className="h-5 w-5 shrink-0" />
              <span className="truncate">{sending ? "Sending…" : "Text"}</span>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}