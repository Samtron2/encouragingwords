import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyMembershipChanged } from "@/hooks/useMembership";

const SYNC_KEY = "ew-subscription-synced";

function clearParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete("checkout");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

// Handles ?checkout=success|cancelled and syncs the subscription once per session.
export function useCheckoutReturn(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    const result = new URLSearchParams(window.location.search).get("checkout");

    if (result === "success") {
      clearParam();
      (async () => {
        await supabase.functions.invoke("check-subscription");
        try { sessionStorage.setItem(SYNC_KEY, "1"); } catch {}
        notifyMembershipChanged();
        toast.success("You're in. Thank you for keeping the lights on.");
      })();
      return;
    }
    if (result === "cancelled") {
      clearParam();
      toast("No charge was made.");
    }

    let synced = false;
    try { synced = sessionStorage.getItem(SYNC_KEY) === "1"; } catch {}
    if (!synced) {
      try { sessionStorage.setItem(SYNC_KEY, "1"); } catch {}
      void supabase.functions.invoke("check-subscription").then(() => notifyMembershipChanged());
    }
  }, [userId]);
}
