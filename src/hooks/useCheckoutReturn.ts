import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyMembershipChanged } from "@/hooks/useMembership";

const SYNC_KEY = "ew-subscription-synced";

export const PENDING_GIFT_KEY = "ew-pending-gift";

function clearParam(name = "checkout") {
  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

// Handles ?checkout=success|cancelled and syncs the subscription once per session.
export function useCheckoutReturn(userId: string | undefined) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!userId) return;

    let pendingGift: string | null = null;
    try { pendingGift = localStorage.getItem(PENDING_GIFT_KEY); } catch {}
    if (pendingGift) {
      try { localStorage.removeItem(PENDING_GIFT_KEY); } catch {}
      navigate(`/gift/${encodeURIComponent(pendingGift)}`, { replace: true });
      return;
    }

    const gift = new URLSearchParams(window.location.search).get("gift");
    if (gift === "sent") {
      clearParam("gift");
      toast.success("Your gift is on its way.");
    } else if (gift === "cancelled") {
      clearParam("gift");
      toast("No charge was made.");
    }
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
  }, [userId, navigate]);
}
