// Dormant while BILLING_ENABLED !== "true". See src/lib/billing.ts.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (Deno.env.get("BILLING_ENABLED") !== "true") {
    console.log("[check-subscription] disabled");
    return json({ disabled: true, message: "Billing is not enabled yet." });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;
    const email = (claims.claims.email as string) || undefined;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe not configured" }, 500);

    const Stripe = (await import("npm:stripe@14")).default;
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let customerId: string | undefined;
    if (email) {
      const found = await stripe.customers.list({ email, limit: 1 });
      customerId = found.data[0]?.id;
    }

    let status = "none";
    let planInterval: string | null = null;
    let currentPeriodEnd: string | null = null;
    let cancelAtPeriodEnd = false;
    let subscriptionId: string | null = null;

    if (customerId) {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 1 });
      const sub = subs.data[0];
      if (sub) {
        subscriptionId = sub.id;
        status = sub.status;
        planInterval = sub.items.data[0]?.price.recurring?.interval ?? null;
        currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
        cancelAtPeriodEnd = sub.cancel_at_period_end;
      }
    }

    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId ?? null,
        stripe_subscription_id: subscriptionId,
        status,
        plan_interval: planInterval,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    console.log("[check-subscription] synced", { userId, status });
    return json({ status, plan_interval: planInterval, current_period_end: currentPeriodEnd, cancel_at_period_end: cancelAtPeriodEnd });
  } catch (err) {
    console.error("[check-subscription] error", err);
    return json({ error: (err as Error).message }, 500);
  }
});
