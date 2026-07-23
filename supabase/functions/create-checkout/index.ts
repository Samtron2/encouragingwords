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
    console.log("[create-checkout] disabled");
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
    const userId = claims.claims.sub as string;
    const email = (claims.claims.email as string) || undefined;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const priceId = Deno.env.get("STRIPE_MONTHLY_PRICE_ID");
    if (!stripeKey || !priceId) {
      console.error("[create-checkout] missing stripe secrets");
      return json({ error: "Stripe not configured" }, 500);
    }

    const Stripe = (await import("npm:stripe@14")).default;
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Reuse an existing customer if we can find one by email.
    let customerId: string | undefined;
    if (email) {
      const found = await stripe.customers.list({ email, limit: 1 });
      customerId = found.data[0]?.id;
    }

    const origin = "https://sendencouragingwords.com";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      metadata: { user_id: userId },
      subscription_data: { metadata: { user_id: userId } },
    });

    console.log("[create-checkout] session created", { userId, sessionId: session.id });
    return json({ url: session.url });
  } catch (err) {
    console.error("[create-checkout] error", err);
    return json({ error: (err as Error).message }, 500);
  }
});
