import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const PAYWALL_BODY =
  "If sending them makes you feel good, keep going. It's $19.95 for the year or $1.95 a month. That's how we keep the lights on.";

export default function PlanButtons() {
  const [loadingPlan, setLoadingPlan] = useState<"annual" | "monthly" | null>(null);

  const start = async (plan: "annual" | "monthly") => {
    setLoadingPlan(plan);
    const { data, error } = await supabase.functions.invoke("create-checkout", { body: { plan } });
    if (error || !data?.url) {
      console.error("create-checkout failed", error, data);
      toast.error("Something went wrong opening checkout. Please try again.");
      setLoadingPlan(null);
      return;
    }
    window.location.href = data.url;
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        onClick={() => start("annual")}
        disabled={!!loadingPlan}
        className="h-12 rounded-full bg-accent text-accent-foreground font-bold hover:bg-accent/90 gap-2"
      >
        {loadingPlan === "annual" && <Loader2 className="h-4 w-4 animate-spin" />}
        $19.95 a year
        <span className="rounded-full bg-accent-foreground/15 px-2 py-0.5 text-xs font-semibold">Best deal</span>
      </Button>
      <Button
        variant="outline"
        onClick={() => start("monthly")}
        disabled={!!loadingPlan}
        className="h-12 rounded-full border-accent/40 font-bold gap-2"
      >
        {loadingPlan === "monthly" && <Loader2 className="h-4 w-4 animate-spin" />}
        $1.95 a month
      </Button>
    </div>
  );
}
