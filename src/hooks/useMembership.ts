import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FREE_WORDS_TOTAL } from "@/lib/billing";

export { FREE_WORDS_TOTAL };

export type MembershipReason = "admin" | "comped" | "subscription" | "free";

export function useMembership() {
  const { user } = useAuth();
  const [isMember, setIsMember] = useState(false);
  const [reason, setReason] = useState<MembershipReason>("free");
  const [freeUsed, setFreeUsed] = useState(0);
  const [plan, setPlan] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setIsMember(false);
      setReason("free");
      setFreeUsed(0);
      setLoading(false);
      return;
    }
    const [{ data: m, error }, { data: sub }] = await Promise.all([
      supabase.rpc("my_membership"),
      supabase
        .from("subscriptions")
        .select("plan_interval, current_period_end, cancel_at_period_end")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    if (error) console.error("my_membership failed", error);
    const info = (m ?? {}) as { is_member?: boolean; reason?: MembershipReason; free_used?: number };
    setIsMember(!!info.is_member);
    setReason(info.reason ?? "free");
    setFreeUsed(info.free_used ?? 0);
    setPlan(sub?.plan_interval ?? null);
    setCurrentPeriodEnd(sub?.current_period_end ?? null);
    setCancelAtPeriodEnd(!!sub?.cancel_at_period_end);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const freeLeft = Math.max(0, FREE_WORDS_TOTAL - freeUsed);

  return { isMember, reason, freeUsed, freeLeft, plan, currentPeriodEnd, cancelAtPeriodEnd, loading, refresh };
}
