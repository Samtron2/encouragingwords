// Dormant while BILLING_ENABLED !== "true". See src/lib/billing.ts.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { PRICES } from "../_shared/billing-prices.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const Body = z.object({
  recipient_name: z.string().trim().min(1).max(80),
  recipient_email: z.string().trim().email().max(255),
  note: z.string().trim().max(300).optional().nullable(),
  purchaser_name: z.string().trim().min(1).max(80),
});

function urlSafeToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (Deno.env.get("BILLING_ENABLED") !== "true") {
    console.log("[create-gift-checkout] disabled");
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
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;
    const email = (claims.claims.email as string) || undefined;

    let raw: unknown;
    try { raw = await req.json(); } catch { raw = null; }
    const parsed = Body.safeParse(raw);
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const input = parsed.data;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe not configured" }, 500);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: gift, error: insErr } = await admin
      .from("gifts")
      .insert({
        purchaser_user_id: userId,
        purchaser_name: input.purchaser_name,
        recipient_name: input.recipient_name,
        recipient_email: input.recipient_email,
        note: input.note || null,
        redeem_token: urlSafeToken(),
      })
      .select("id")
      .single();
    if (insErr || !gift) {
      console.error("[create-gift-checkout] insert failed", insErr);
      return json({ error: "Could not create gift" }, 500);
    }

    const Stripe = (await import("npm:stripe@14")).default;
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const origin = "https://sendencouragingwords.com";
    const metadata = { kind: "gift", gift_id: gift.id };
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: PRICES.GIFT_YEAR, quantity: 1 }],
      customer_email: email,
      metadata,
      payment_intent_data: { metadata },
      success_url: `${origin}/?gift=sent`,
      cancel_url: `${origin}/?gift=cancelled`,
    });

    await admin.from("gifts").update({ stripe_checkout_session_id: session.id }).eq("id", gift.id);

    console.log("[create-gift-checkout] session created", { userId, giftId: gift.id, sessionId: session.id });
    return json({ url: session.url });
  } catch (err) {
    console.error("[create-gift-checkout] error", err);
    return json({ error: (err as Error).message }, 500);
  }
});
