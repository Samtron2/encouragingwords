import { useState, useEffect, useCallback, useRef } from "react";

const DRAFT_KEY = "ew-composer-draft";

export interface ComposerDraft {
  recipientInput: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  message: string;
  selectedVisualId: string | null;
  selectedPrompt: string | null;
}

const EMPTY_DRAFT: ComposerDraft = {
  recipientInput: "",
  recipientName: "",
  recipientEmail: "",
  recipientPhone: "",
  message: "",
  selectedVisualId: null,
  selectedPrompt: null,
};

function loadDraft(): ComposerDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ComposerDraft;
    // Only restore if there's meaningful content
    if (parsed.recipientInput || parsed.message || parsed.selectedVisualId) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function useComposerDraft() {
  const [draftRestored, setDraftRestored] = useState(false);
  const initialDraft = useRef(loadDraft());

  const saveDraft = useCallback((draft: ComposerDraft) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage full or unavailable
    }
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftRestored(false);
  }, []);

  return {
    initialDraft: initialDraft.current,
    draftRestored,
    setDraftRestored,
    saveDraft,
    clearDraft,
  };
}
