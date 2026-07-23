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
    console.log("[customer-portal] disabled");
    return json({ disabled: true, message: "Billing is not enabled yet." });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const email = (claims.claims.email as string) || undefined;
    if (!email) return json({ error: "No email on account" }, 400);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe not configured" }, 500);

    const Stripe = (await import("npm:stripe@14")).default;
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const found = await stripe.customers.list({ email, limit: 1 });
    const customerId = found.data[0]?.id;
    if (!customerId) return json({ error: "No Stripe customer for this account" }, 404);

    const origin = "https://sendencouragingwords.com";
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/`,
    });

    console.log("[customer-portal] session created", { email });
    return json({ url: portal.url });
  } catch (err) {
    console.error("[customer-portal] error", err);
    return json({ error: (err as Error).message }, 500);
  }
});
