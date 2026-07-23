import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDailyVisuals } from "@/hooks/useDailyVisuals";
import { useComposerDraft } from "@/hooks/useComposerDraft";
import { useOccasionVisuals, SPECIAL_OCCASIONS } from "@/hooks/useOccasionVisuals";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";
import { Mail, MessageSquare, Check, User, AlertCircle, Pencil, Camera, X, Mic, Loader2, BookUser } from "lucide-react";
import { toast } from "sonner";
import { isContactPickerSupported, pickContact } from "@/lib/contactPicker";
import ContactDetailsChooser from "@/components/ContactDetailsChooser";
import { getSmsCapability, type SmsCapability } from "@/lib/deviceCapabilities";

const PROMPT_SUGGESTIONS: Record<string, string[]> = {
  default: [
    "Thinking of you",
    "You've got this",
    "So proud of you",
    "You made my day",
    "Just because.",
    "You are enough",
    "Keep shining ✨",
    "I believe in you",
    "You are stronger than you know.",
    "The world is better with you in it.",
    "You showed up. That matters.",
    "I see how hard you work. It's paying off.",
  ],
  "Birthday": [
    "Happy Birthday! 🎂",
    "Wishing you the best day.",
    "Hope today feels as special as you are.",
    "Another year of being wonderful.",
    "Celebrate yourself today — you deserve it.",
    "So glad you were born.",
    "Here's to you today and every day.",
    "May this birthday bring you everything you hoped for.",
  ],
  "Anniversary": [
    "Happy Anniversary ❤️",
    "Celebrating you both today.",
    "Love looks good on you.",
    "What a beautiful thing you've built together.",
    "Still rooting for you both, always.",
    "Here's to many more years of the good stuff.",
  ],
  "Quinceañera": [
    "Happy Quinceañera! 👑",
    "Today you shine.",
    "This is just the beginning of something beautiful.",
    "So proud of the young woman you're becoming.",
    "Celebrating you today and always.",
    "What a joy it is to watch you grow.",
  ],
  "Graduation": [
    "Congratulations, graduate! 🎓",
    "You did it. You really did it.",
    "All that hard work paid off.",
    "So incredibly proud of you.",
    "This is just the beginning.",
    "The world is ready for you — go get it.",
    "Every late night was worth it.",
  ],
  "Wedding": [
    "Wishing you a lifetime of joy.",
    "Congratulations on your wedding day! 💍",
    "Love wins. Always.",
    "So happy for you both today.",
    "Here's to your beautiful beginning.",
    "May every day feel like this one.",
  ],
  "New Baby": [
    "Welcome to the world, little one 👶",
    "Congratulations on your new arrival!",
    "Your family just got a little more wonderful.",
    "So much love for your growing family.",
    "What a blessing. Wishing you rest and joy.",
    "The best adventure is just beginning.",
  ],
  "Sympathy": [
    "I'm so sorry for your loss.",
    "Thinking of you during this hard time.",
    "You don't have to go through this alone.",
    "Sending you love and peace today.",
    "Grief is love with nowhere to go. I'm here.",
    "There are no words. Just know I care.",
    "I'm holding you in my heart.",
  ],
  "Get Well": [
    "Wishing you a speedy recovery 💚",
    "Rest up. We need you at full strength.",
    "Thinking of you — feel better soon.",
    "Sending healing thoughts your way.",
    "Take it one day at a time. You've got this.",
    "I'm rooting for you to feel like yourself again.",
  ],
  "Retirement": [
    "Happy Retirement! 🏖️",
    "You've earned every bit of this.",
    "Time to do exactly what you want.",
    "What a career. What a person.",
    "The next chapter is going to be great.",
    "So grateful for everything you gave.",
  ],
  "Mother's Day": [
    "Happy Mother's Day 🌹",
    "Thank you for everything you do.",
    "You are loved more than words can say.",
    "The world is better because of you.",
    "Grateful for you every single day.",
    "You make it look easy, even when it isn't.",
  ],
  "Father's Day": [
    "Happy Father's Day ⭐",
    "Thank you for always showing up.",
    "You set the bar. And it's high.",
    "Grateful for everything you've given.",
    "The strongest person I know.",
    "Love you more than I say.",
  ],
  "Valentine's Day": [
    "Happy Valentine's Day ❤️",
    "Grateful for you today and always.",
    "You make ordinary days extraordinary.",
    "I choose you. Every single day.",
    "Thinking of you today.",
    "You are my favorite.",
  ],
  "Thanksgiving": [
    "Grateful for you this Thanksgiving 🧡",
    "You are one of the things I'm most thankful for.",
    "Wishing you a warm and wonderful day.",
    "Thinking of you and counting my blessings.",
    "So thankful our lives crossed paths.",
  ],
  "Christmas": [
    "Merry Christmas! 🎄",
    "Wishing you warmth, joy, and rest.",
    "Grateful for you this holiday season.",
    "Hope your Christmas is everything you hoped for.",
    "Thinking of you during this special time of year.",
    "Sending you love and light this Christmas.",
  ],
  "Hanukkah": [
    "Happy Hanukkah! 🕎",
    "Wishing you light and warmth this season.",
    "Thinking of you and your family.",
    "Eight nights of joy — you deserve every one.",
    "Sending love during this beautiful season.",
  ],
  "Easter": [
    "Happy Easter! 🐣",
    "Wishing you a joyful and peaceful Easter.",
    "Hope your day is filled with warmth.",
    "Thinking of you this Easter season.",
    "Sending love and light your way.",
  ],
  "Just Because": [
    "Just thinking of you.",
    "No reason. Just because you matter.",
    "Wanted you to know I'm thinking of you.",
    "You crossed my mind and I smiled.",
    "You deserve to hear something good today.",
    "I'm glad you're in my life.",
  ],
  "Congratulations": [
    "Congratulations! 🎉",
    "You earned this.",
    "So proud of what you've accomplished.",
    "This is a big deal. Celebrate it.",
    "I knew you could do it.",
    "Amazing things happen to amazing people.",
  ],
  "Thank You": [
    "Thank you from the bottom of my heart.",
    "I don't say it enough — thank you.",
    "What you did meant more than you know.",
    "I am so grateful for you.",
    "You showed up when it mattered. Thank you.",
    "Your kindness didn't go unnoticed.",
  ],
  "Encouragement": [
    "You've got this.",
    "Keep going. You're closer than you think.",
    "Hard days don't last. You do.",
    "I believe in you more than you believe in yourself right now.",
    "One step at a time. You're doing it.",
    "The fact that you're still trying says everything.",
    "You are stronger than you know.",
  ],
};

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
  const [sent, setSent] = useState(false);
  const [sentMethod, setSentMethod] = useState<"email" | "sms" | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [isTouchDevice] = useState(() => typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);
  const [smsCapability] = useState<SmsCapability>(() => getSmsCapability());
  const [successEntered, setSuccessEntered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const contactInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selfieSelected, setSelfieSelected] = useState(false);
  const [photoPublicUrl, setPhotoPublicUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadFailed, setPhotoUploadFailed] = useState(false);
  const photoUploadPromiseRef = useRef<Promise<string | null> | null>(null);
  const photoFileRef = useRef<File | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [nudgeField, setNudgeField] = useState<"email" | "phone" | null>(null);
  const [nudgeInputVisible, setNudgeInputVisible] = useState(false);
  const [nudgeValue, setNudgeValue] = useState("");
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [customMode, setCustomMode] = useState(false);

  // Voice-to-text state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);
  const voiceHintShownRef = useRef(false);
  const { visuals: occasionVisuals, loading: occasionLoading } = useOccasionVisuals(selectedOccasion);
  const activeVisuals = selectedOccasion && occasionVisuals.length > 0 ? occasionVisuals : dailyVisuals;
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

  // Trigger the one-time success icon scale-in when the sent state appears
  useEffect(() => {
    if (sent) {
      setSuccessEntered(true);
    } else {
      setSuccessEntered(false);
    }
  }, [sent]);

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
      selectedPrompt: null,
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
    setPhotoPublicUrl(null);
    setPhotoUploading(false);
    setPhotoUploadFailed(false);
    photoUploadPromiseRef.current = null;
    photoFileRef.current = null;
    setSelectedRecipient(null);
    setNudgeField(null);
    setNudgeInputVisible(false);
    setNudgeValue("");
    setEditingDetails(false);
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
    setEditingDetails(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const [contactPickerSupported] = useState(() => isContactPickerSupported());

  const [pickerChoice, setPickerChoice] = useState<{ name?: string; emails: string[]; phones: string[] } | null>(null);

  const applyPickedContact = (name: string | undefined, email: string, phone: string) => {
    const cleanName = name?.trim() || "";
    if (cleanName) {
      setRecipientInput(cleanName);
      setRecipientName(cleanName);
      setNameConfirmed(true);
    }
    if (email) setRecipientEmail(email);
    if (phone) setRecipientPhone(phone);
    setContactInput(email || phone || "");
    setSelectedRecipient({
      id: "__imported__",
      name: cleanName || null,
      email: email || null,
      phone: phone || null,
      nudge_dismissed: true,
    });
    setShowSuggestions(false);
    setNudgeField(null);
    setNudgeInputVisible(false);
    setNudgeValue("");
    setEditingDetails(false);
  };

  const handlePickContact = async () => {
    try {
      const picked = await pickContact();
      if (!picked) return;
      const needsChooser = picked.emails.length > 1 || picked.phones.length > 1;
      if (!needsChooser) {
        applyPickedContact(picked.name, picked.emails[0] || "", picked.phones[0] || "");
        return;
      }
      setPickerChoice({ name: picked.name, emails: picked.emails, phones: picked.phones });
    } catch {
      toast.error("Couldn't open your contacts. You can type the name instead.");
    }
  };


  // Whether to show "Add [name]" chip — typed ≥2 chars, no suggestion selected, has no exact match, valid name
  const showAddChip = !nameConfirmed
    && recipientInput.trim().length >= 2
    && !selectedRecipient
    && !nameInputInvalid
    && !suggestions.some((s) => s.name?.toLowerCase() === recipientInput.trim().toLowerCase());

  const handleNudgeSave = async () => {
    if (!selectedRecipient || !nudgeValue.trim()) return;
    const isImported = selectedRecipient.id.startsWith("__imported__");
    if (nudgeField === "email") {
      const val = nudgeValue.trim();
      setRecipientEmail(val);
      if (!isImported) {
        await supabase.from("recipients").update({ email: val }).eq("id", selectedRecipient.id);
      }
      setSelectedRecipient({ ...selectedRecipient, email: val } as Recipient);
    } else {
      const val = nudgeValue.trim();
      setRecipientPhone(val);
      if (!isImported) {
        await supabase.from("recipients").update({ phone: val }).eq("id", selectedRecipient.id);
      }
      setSelectedRecipient({ ...selectedRecipient, phone: val } as Recipient);
    }
    setNudgeField(null);
    setNudgeInputVisible(false);
    setNudgeValue("");
    toast.success("Contact updated!");
  };

  const handleNudgeDismiss = async () => {
    if (!selectedRecipient) return;
    if (!selectedRecipient.id.startsWith("__imported__")) {
      await supabase.from("recipients").update({ nudge_dismissed: true }).eq("id", selectedRecipient.id);
    }
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

      // If a selfie/photo is selected, wait (with hard timeout) for the background upload.
      // If it isn't ready, stop the send — never send silently without the photo.
      let uploadedPhotoUrl: string | null = null;
      if (selfieSelected && selfiePreview) {
        if (photoUploadFailed) {
          toast.error("Your photo didn't finish uploading. Tap the photo to retry, or remove it to send without it.");
          setSending(false);
          return;
        }
        if (photoUploadPromiseRef.current) {
          try {
            uploadedPhotoUrl = await withTimeout(photoUploadPromiseRef.current, 10000, "photo upload");
          } catch (err) {
            console.error("Photo upload await failed:", err);
            toast.error("Your photo didn't finish uploading. Tap the photo to retry, or remove it to send without it.");
            setSending(false);
            return;
          }
        } else {
          uploadedPhotoUrl = photoPublicUrl;
        }
        if (!uploadedPhotoUrl) {
          toast.error("Your photo didn't finish uploading. Tap the photo to retry, or remove it to send without it.");
          setSending(false);
          return;
        }
        imageUrl = uploadedPhotoUrl;
      }


      if (method === "email") {
        const idempotencyKey = `encouraging-${user.id}-${Date.now()}`;

        const senderProfile = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .single();

        const senderName = senderProfile.data?.display_name || null;

        const emailImageUrl = selfieSelected
          ? (uploadedPhotoUrl || undefined)
          : (!imageUrl || imageUrl.startsWith("blob:") ? undefined : imageUrl);

        const sendResult = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "encouraging-message",
            recipientEmail,
            idempotencyKey,
            templateData: {
              recipientName: recipientName || undefined,
              senderName: senderName || undefined,
              message: message.trim(),
              visualImageUrl: emailImageUrl,
              visualEmoji: selfieSelected ? undefined : emojiChar,
            },
          },
        });

        const status = sendResult.error ? "failed" : "sent";

        const { error: logError } = await supabase.from("messages").insert({
          user_id: user.id,
          recipient_id: recipientRow?.id || null,
          message_text: message.trim(),
          visual_id: visual?.id || null,
          delivery_method: "email",
          status,
        });
        if (logError) console.error("Failed to log email message:", logError);

        if (sendResult.error || sendResult.data?.error) {
          console.error("Send failed:", sendResult.error || sendResult.data?.error);
          setSendError(true);
          setSending(false);
          return;
        }
      } else {
        // Create a reveal token so the SMS recipient gets the full experience.
        let revealToken: string | null = null;
        try {
          // 12-char base62 token (~71 bits) via rejection sampling for uniform distribution.
          const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
          const TOKEN_LEN = 12;
          const chars: string[] = [];
          const buf = new Uint8Array(1);
          while (chars.length < TOKEN_LEN) {
            crypto.getRandomValues(buf);
            // 62 * 4 = 248; reject bytes >= 248 to keep uniform mod 62
            if (buf[0] < 248) chars.push(ALPHABET[buf[0] % 62]);
          }
          const candidate = chars.join("");

          const senderProfile = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", user.id)
            .single();
          const senderName = senderProfile.data?.display_name || null;

          let tokenVisualImageUrl: string | null = null;
          let tokenVisualEmoji: string | null = null;
          if (selfieSelected && uploadedPhotoUrl) {
            tokenVisualImageUrl = uploadedPhotoUrl;
          } else if (emojiChar) {
            tokenVisualEmoji = emojiChar;
          } else if (imageUrl && !imageUrl.startsWith("blob:")) {
            tokenVisualImageUrl = imageUrl;
          }

          const { error: tokenError } = await supabase.from("message_tokens").insert({
            token: candidate,
            sender_name: senderName,
            recipient_name: recipientName || null,
            message_text: message.trim(),
            visual_image_url: tokenVisualImageUrl,
            visual_emoji: tokenVisualEmoji,
          });
          if (tokenError) {
            console.error("Failed to create message token:", tokenError);
          } else {
            revealToken = candidate;
          }
        } catch (err) {
          console.error("Token creation error:", err);
        }

        const trimmed = message.trim();
        const smsText = revealToken
          ? `${trimmed}\n\nOpen your Encouraging Word: ${window.location.origin}/m/${revealToken}`
          : trimmed;
        const smsBody = encodeURIComponent(smsText);
        const smsUrl = `sms:${recipientPhone}?body=${smsBody}`;

        const { error: smsLogError } = await supabase.from("messages").insert({
          user_id: user.id,
          recipient_id: recipientRow?.id || null,
          message_text: trimmed,
          visual_id: visual?.id || null,
          delivery_method: "sms_native",
          status: "initiated",
          reveal_token: revealToken,
        });
        if (smsLogError) console.error("Failed to log SMS message:", smsLogError);

        window.location.href = smsUrl;
      }

      setSentMethod(method);

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


  const toggleVisualSelection = () => {
    setSelectedVisual(selectedVisual === visualIndex ? null : visualIndex);
    if (selectedVisual !== visualIndex) {
      setSelfieSelected(false);
    }
  };

  const activePrompts = selectedOccasion && PROMPT_SUGGESTIONS[selectedOccasion]
    ? PROMPT_SUGGESTIONS[selectedOccasion]
    : PROMPT_SUGGESTIONS.default;

  const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
    Promise.race([
      p,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
    ]);

  const drawToJpegBlob = async (
    src: CanvasImageSource,
    srcW: number,
    srcH: number,
    maxDim: number,
    quality: number,
  ): Promise<Blob> => {
    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas ctx");
    ctx.drawImage(src, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", quality);
    });
  };

  const resizeImageToJpeg = async (file: File, maxDim = 1600, quality = 0.85): Promise<Blob> => {
    // Prefer createImageBitmap — decodes off-main-thread and avoids the FileReader data-URL memory hit.
    if (typeof createImageBitmap === "function") {
      let bitmap: ImageBitmap | null = null;
      try {
        bitmap = await createImageBitmap(file);
        const blob = await drawToJpegBlob(bitmap, bitmap.width, bitmap.height, maxDim, quality);
        return blob;
      } finally {
        try { bitmap?.close?.(); } catch { /* noop */ }
      }
    }
    // Fallback: object URL + Image (never FileReader data URLs).
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("image load failed"));
        i.src = objectUrl;
      });
      return await drawToJpegBlob(img, img.width, img.height, maxDim, quality);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const startPhotoUpload = (file: File) => {
    if (!user) return;
    photoFileRef.current = file;
    setPhotoPublicUrl(null);
    setPhotoUploadFailed(false);
    setPhotoUploading(true);
    const promise = (async (): Promise<string | null> => {
      try {
        let uploadBlob: Blob;
        let contentType = "image/jpeg";
        let ext = "jpg";
        try {
          uploadBlob = await withTimeout(resizeImageToJpeg(file), 15000, "resize");
        } catch (resizeErr) {
          console.warn("Resize failed/timed out, considering original:", resizeErr);
          const okType = file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp";
          if (okType && file.size <= 5 * 1024 * 1024) {
            uploadBlob = file;
            contentType = file.type;
            ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
          } else {
            throw resizeErr;
          }
        }
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("message-photos")
          .upload(path, uploadBlob, { contentType, upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("message-photos").getPublicUrl(path);
        const url = pub.publicUrl;
        setPhotoPublicUrl(url);
        return url;
      } catch (err) {
        console.error("Photo upload failed:", err);
        setPhotoUploadFailed(true);
        toast.error("Couldn't upload your photo — tap it to try again.");
        return null;
      } finally {
        setPhotoUploading(false);
      }
    })();
    photoUploadPromiseRef.current = promise;
  };

  const retryPhotoUpload = () => {
    const f = photoFileRef.current;
    if (f) startPhotoUpload(f);
  };


  const cleanupRecording = () => {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
    if (autoStopTimerRef.current) { clearTimeout(autoStopTimerRef.current); autoStopTimerRef.current = null; }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
  };

  useEffect(() => () => cleanupRecording(), []);

  const pickAudioMimeType = (): string => {
    const candidates = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/mp4;codecs=mp4a.40.2"];
    if (typeof MediaRecorder !== "undefined" && (MediaRecorder as any).isTypeSupported) {
      for (const c of candidates) {
        try { if ((MediaRecorder as any).isTypeSupported(c)) return c; } catch { /* noop */ }
      }
    }
    // iOS Safari best-guess
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ? "audio/mp4" : "audio/webm";
  };

  const insertTranscript = (text: string) => {
    setMessage(text);
    setPendingTranscript(null);
    setTimeout(() => {
      const el = messageTextareaRef.current;
      if (el) {
        el.focus();
        try { el.setSelectionRange(text.length, text.length); } catch { /* noop */ }
      }
    }, 50);
    if (!voiceHintShownRef.current) {
      voiceHintShownRef.current = true;
      toast("Look it over, make it yours, then send.");
    }
  };

  const processAudioBlob = async (blob: Blob, mimeType: string) => {
    setTranscribing(true);
    try {
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const base64 = btoa(binary);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-voice`;
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ audio: base64, mimeType }),
          signal: controller.signal,
        });
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err?.name === "AbortError") {
          toast.error("That took too long. Please try a shorter recording.");
        } else {
          toast.error("Couldn't reach the transcription service. Please try again.");
        }
        return;
      }
      clearTimeout(timeoutId);

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok || !json?.text) {
        toast.error(json?.error || "Couldn't transcribe that recording. Please try again.");
        return;
      }
      const text: string = json.text;
      if (message.trim().length > 0 && text.trim() !== message.trim()) {
        setPendingTranscript(text);
      } else {
        insertTranscript(text);
      }
    } catch (err) {
      console.error("Transcription error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setTranscribing(false);
    }
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      try { rec.stop(); } catch { /* noop */ }
    } else {
      cleanupRecording();
      setIsRecording(false);
    }
  };

  const startRecording = async () => {
    if (isRecording || transcribing) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Voice recording isn't supported on this browser.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
        toast.error("Microphone is blocked. Enable it in your browser settings and try again.");
      } else if (name === "NotFoundError") {
        toast.error("No microphone found.");
      } else {
        toast.error("Couldn't start recording. Please try again.");
      }
      return;
    }

    const mimeType = pickAudioMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch {
      try { recorder = new MediaRecorder(stream); } catch {
        stream.getTracks().forEach((t) => t.stop());
        toast.error("Couldn't start recording. Please try again.");
        return;
      }
    }

    mediaStreamRef.current = stream;
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const chunks = audioChunksRef.current;
      const type = recorder.mimeType || mimeType;
      cleanupRecording();
      setIsRecording(false);
      setRecordingSeconds(0);
      if (!chunks.length) {
        toast.error("Didn't catch that. Try recording again.");
        return;
      }
      const blob = new Blob(chunks, { type });
      if (blob.size < 1024) {
        toast.error("That recording was too short. Please try again.");
        return;
      }
      await processAudioBlob(blob, type);
    };
    recorder.onerror = () => {
      cleanupRecording();
      setIsRecording(false);
      setRecordingSeconds(0);
      toast.error("Recording error. Please try again.");
    };

    try {
      recorder.start();
    } catch {
      cleanupRecording();
      toast.error("Couldn't start recording. Please try again.");
      return;
    }
    setIsRecording(true);
    setRecordingSeconds(0);
    recordTimerRef.current = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    autoStopTimerRef.current = setTimeout(() => {
      stopRecording();
    }, 60000);
  };

  if (sent) {
    return (
      <div className="fixed inset-x-0 top-0 bottom-16 z-40 flex items-center justify-center bg-background px-6 animate-fade-in">
        <div className="relative w-full max-w-[360px] flex flex-col items-center text-center">
          {/* Subtle gold radial glow centered behind the icon */}
          <div
            className="absolute left-1/2 top-12 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-accent/10 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div
            className={`relative z-10 h-24 w-24 rounded-full bg-accent flex items-center justify-center transition-transform duration-400 ease-out ${successEntered ? "scale-100" : "scale-90"}`}
          >
            <Check className="h-12 w-12 text-accent-foreground stroke-[3]" />
          </div>

          <h2 className="font-display text-4xl font-bold text-primary text-balance mt-6">
            {sentMethod === "sms" ? "Almost there" : "Your words are on their way"}
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed text-lg">
            {sentMethod === "sms"
              ? "Your message is ready in Messages — just hit send."
              : "You just made someone's day a little brighter."}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 w-full">
            <Button
              className="rounded-full bg-accent text-accent-foreground font-bold px-8 h-14 text-lg shadow-[0_4px_16px_hsl(var(--accent)/0.15)] hover:bg-accent/90"
              onClick={onBack}
            >
              Back to home
            </Button>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-accent-foreground hover:bg-transparent"
              onClick={() => {
                handleClearDraft();
                setSent(false);
              }}
            >
              Send another word
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 pb-24 pt-6 animate-fade-in overflow-x-hidden max-w-full">
      <input
        ref={selfieInputRef}
        type="file"
        accept="image/*"
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", pointerEvents: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            setSelfiePreview(url);
            setSelfieSelected(true);
            setSelectedVisual(null);
            startPhotoUpload(file);
          }
          // reset so selecting the same file again re-triggers onChange
          e.target.value = "";
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
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent text-sm font-bold mr-2">
              1
            </span>
            Who's it for
          </label>


          {!nameConfirmed ? (
            <>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  autoComplete="off"
                  name="recipient-contact-name"
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

              {contactPickerSupported && (
                <div className="flex justify-center mt-3">
                  <button
                    type="button"
                    onClick={handlePickContact}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/70 transition-colors"
                  >
                    <BookUser className="h-4 w-4" />
                    Choose from contacts
                  </button>
                </div>
              )}
            </>
          ) : selectedRecipient ? (
            /* Selected saved/imported recipient — clean summary card */
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-left">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground text-[15px] font-semibold">
                  {(recipientName || "?")[0].toUpperCase()}
                </div>
                <span className="text-lg font-medium text-foreground flex-1 truncate">{recipientName}</span>
                <button
                  onClick={editName}
                  className="p-1.5 rounded-full hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Edit name"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {recipientEmail && recipientPhone
                  ? "Email and phone on file"
                  : recipientEmail
                  ? "Email on file"
                  : recipientPhone
                  ? "Phone on file"
                  : ""}
              </p>
              <button
                type="button"
                onClick={() => setEditingDetails((v) => !v)}
                className="mt-2 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
              >
                {editingDetails ? "Done" : "Edit details"}
              </button>
              {editingDetails && (
                <div className="mt-3 animate-fade-in space-y-2">
                  <Input
                    type="email"
                    autoComplete="off"
                    name="recipient-email-edit"
                    placeholder="Email address"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="text-base py-3"
                  />
                  <Input
                    type="tel"
                    autoComplete="off"
                    name="recipient-phone-edit"
                    placeholder="Phone number"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="text-base py-3"
                  />
                </div>
              )}
            </div>
          ) : (
            /* Name confirmed — read-only display for new typed recipients */
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
                autoComplete="off"
                name="recipient-contact-detail"
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
                    autoComplete="off"
                    name="recipient-contact-detail"
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
              value={customMode ? "__other__" : selectedOccasion || ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "__other__") {
                  setCustomMode(true);
                  setSelectedOccasion(null);
                } else {
                  setCustomMode(false);
                  setSelectedOccasion(val || null);
                }
                setSelectedVisual(null);
              }}
              className="w-full rounded-2xl border border-input bg-card px-5 py-4 text-lg text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring appearance-none cursor-pointer"
            >
              <option value="">No special occasion</option>
              {SPECIAL_OCCASIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
              <option value="__other__">Other…</option>
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              ▾
            </span>
          </div>
          {customMode && (
            <input
              type="text"
              value={selectedOccasion || ""}
              onChange={(e) => setSelectedOccasion(e.target.value || null)}
              maxLength={40}
              placeholder="Type the occasion (e.g., Halloween)"
              autoFocus
              className="mt-3 w-full rounded-2xl border border-input bg-card px-5 py-4 text-lg text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}
        </section>

        {/* STEP 2 — WHAT */}
        <section className="mb-8">
          <label className="text-lg font-medium text-muted-foreground mb-2 block">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent text-sm font-bold mr-2">
              2
            </span>
            Your words
          </label>

          <div className="relative">
            <textarea
              ref={messageTextareaRef}
              value={message}
              onChange={(e) => {
                if (e.target.value.length <= 160) setMessage(e.target.value);
              }}
              placeholder="Write something kind…"
              rows={4}
              disabled={isRecording || transcribing}
              className="flex w-full rounded-2xl border border-input bg-card px-5 py-5 text-lg ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none font-body shadow-card leading-relaxed disabled:opacity-70"
            />
            <span className="absolute bottom-3 right-4 text-[15px] text-muted-foreground">
              {message.length}/160
            </span>
          </div>

          {/* Voice-to-text controls */}
          <div className="mt-3">
            {!isRecording && !transcribing && (
              <button
                type="button"
                onClick={startRecording}
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-base font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Mic className="h-4 w-4" />
                Speak it
              </button>
            )}
            {isRecording && (
              <div className="flex items-center gap-3 rounded-full border border-destructive/30 bg-destructive/5 px-4 py-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60 animate-ping" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
                </span>
                <span className="text-base font-medium text-destructive tabular-nums">
                  Recording… {recordingSeconds}s
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={stopRecording}
                  className="ml-auto rounded-full h-8 px-4 text-sm bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Done
                </Button>
              </div>
            )}
            {transcribing && (
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-4 py-2 text-base text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Polishing your words…
              </div>
            )}
          </div>

          {/* Replace-confirmation prompt when textarea already has content */}
          {pendingTranscript && (
            <div className="mt-3 rounded-2xl border border-border bg-card p-4 text-left">
              <p className="text-sm text-muted-foreground mb-2">Replace your current message with this?</p>
              <p className="text-base text-foreground italic mb-3">"{pendingTranscript}"</p>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPendingTranscript(null)}
                  className="rounded-full h-8 px-4 text-sm"
                >
                  Keep original
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => insertTranscript(pendingTranscript)}
                  className="rounded-full h-8 px-4 text-sm bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Replace
                </Button>
              </div>
            </div>
          )}

          <div className="mt-3">
            <p className="text-sm text-muted-foreground mb-2">Or tap a starter:</p>
            <div className="flex flex-wrap gap-2">
              {activePrompts.map((prompt) => {
                const isSelected = message === prompt;
                return (
                  <button
                    key={prompt}
                    onClick={() => setMessage(prompt)}
                    className={`rounded-full border px-4 py-2 text-base font-medium transition-colors text-center leading-snug ${
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
            <p className="text-lg text-muted-foreground mb-3">
              {selectedOccasion && occasionVisuals.length > 0 ? `Visuals for ${selectedOccasion}` : "Choose a visual (optional)"}
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
                                    if (photoUploadFailed) {
                                      retryPhotoUpload();
                                      return;
                                    }
                                    setSelfieSelected(!selfieSelected);
                                    if (!selfieSelected) setSelectedVisual(null);
                                  }}
                                  className="flex flex-col items-center gap-2 transition-all"
                                >
                                  <div className="relative">
                                    <img
                                      src={selfiePreview}
                                      alt="Your photo"
                                      className={`h-[240px] w-[240px] rounded-[16px] object-cover transition-all ${
                                        selfieSelected
                                          ? "ring-[3px] ring-accent ring-offset-2 ring-offset-background scale-[1.03]"
                                          : ""
                                      }`}
                                    />
                                    {photoUploading && (
                                      <div className="absolute inset-0 rounded-[16px] bg-background/40 backdrop-blur-[1px] flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 text-foreground animate-spin" />
                                      </div>
                                    )}
                                    {photoUploadFailed && !photoUploading && (
                                      <div className="absolute inset-0 rounded-[16px] bg-destructive/70 flex flex-col items-center justify-center gap-1 text-destructive-foreground">
                                        <AlertCircle className="h-7 w-7" />
                                        <span className="text-sm font-semibold">Tap to retry</span>
                                      </div>
                                    )}
                                    {!photoUploading && !photoUploadFailed && photoPublicUrl && (
                                      <div className="absolute bottom-2 left-2 h-7 w-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-sm">
                                        <Check className="h-4 w-4" />
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[15px] text-muted-foreground">Your photo</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelfiePreview(null);
                                    setSelfieSelected(false);
                                    setPhotoPublicUrl(null);
                                    setPhotoUploading(false);
                                    setPhotoUploadFailed(false);
                                    photoUploadPromiseRef.current = null;
                                    photoFileRef.current = null;
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
                  <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full border border-accent/40 bg-card/80 text-accent backdrop-blur-sm transition-opacity hover:bg-card hover:border-accent/60 disabled:opacity-30" />
                  <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full border border-accent/40 bg-card/80 text-accent backdrop-blur-sm transition-opacity hover:bg-card hover:border-accent/60 disabled:opacity-30" />
                </Carousel>
              </div>
            )}
            <p className="font-display italic text-sm text-muted-foreground text-center mt-3">
              {selectedOccasion && occasionVisuals.length > 0 ? `Showing visuals for ${selectedOccasion}` : "Today's visuals · refreshes at midnight"}
            </p>
          </div>
        </section>

        {/* STEP 3 — HOW */}
        <section>
          <label className="text-lg font-medium text-muted-foreground mb-3 block">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent text-sm font-bold mr-2">
              3
            </span>
            Send it
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
              disabled={smsCapability === "none" || !canSendSms || !message.trim() || sending}
              className="gap-2 h-16 font-bold text-lg font-body text-white hover:opacity-90 disabled:opacity-40 min-w-0"
              style={{ flex: "1 1 45%", borderRadius: "999px", backgroundColor: "hsl(var(--primary))" }}
            >
              <MessageSquare className="h-5 w-5 shrink-0" />
              <span className="truncate">{sending ? "Sending…" : "Text"}</span>
            </Button>
          </div>

          {smsCapability === "partial" && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              On a Mac, Text opens your Messages app.
            </p>
          )}
          {smsCapability === "none" && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Texting works from your phone. Email works everywhere.
            </p>
          )}
          {smsCapability === "full" && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Email sends right from the app. Text opens your Messages so it sends from your number.
            </p>
          )}

          {nameConfirmed && message.trim() && !sending && (
            <div className="mt-3 text-center text-sm text-muted-foreground">
              {!recipientEmail && (
                <span>Add their email address to send this as an email.</span>
              )}
              {!recipientPhone && recipientEmail && smsCapability !== "none" && (
                <span>Add their phone number to send this as a text.</span>
              )}
            </div>
          )}
        </section>
      </div>

      <ContactDetailsChooser
        open={!!pickerChoice}
        name={pickerChoice?.name}
        emails={pickerChoice?.emails ?? []}
        phones={pickerChoice?.phones ?? []}
        onCancel={() => setPickerChoice(null)}
        onConfirm={(choice) => {
          applyPickedContact(pickerChoice?.name, choice.email, choice.phone);
          setPickerChoice(null);
        }}
      />
    </div>
  );
}