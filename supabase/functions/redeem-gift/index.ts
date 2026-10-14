import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const Body = z.object({ token: z.string().min(10).max(200) });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (Deno.env.get("BILLING_ENABLED") !== "true") {
    console.log("[redeem-gift] disabled");
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

    let raw: unknown;
    try { raw = await req.json(); } catch { raw = null; }
    const parsed = Body.safeParse(raw);
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { token } = parsed.data;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Stack on top of any unexpired gift year.
    const now = new Date();
    const { data: latest } = await admin
      .from("gifts")
      .select("access_until")
      .eq("redeemed_by", userId)
      .gt("access_until", now.toISOString())
      .order("access_until", { ascending: false })
      .limit(1)
      .maybeSingle();
    const base = latest?.access_until ? new Date(latest.access_until) : now;
    const until = new Date(base);
    until.setFullYear(until.getFullYear() + 1);

    const { data: updated, error: updErr } = await admin
      .from("gifts")
      .update({
        status: "redeemed",
        redeemed_by: userId,
        redeemed_at: now.toISOString(),
        access_until: until.toISOString(),
      })
      .eq("redeem_token", token)
      .eq("status", "paid")
      .select("id, access_until");
    if (updErr) {
      console.error("[redeem-gift] update failed", updErr);
      return json({ error: "Could not claim gift" }, 500);
    }
    if (!updated || updated.length === 0) {
      const { data: current } = await admin.from("gifts").select("status").eq("redeem_token", token).maybeSingle();
      return json({ error: "not_claimable", status: current?.status ?? "not_found" }, 409);
    }

    console.log("[redeem-gift] redeemed", { userId, giftId: updated[0].id });
    return json({ access_until: updated[0].access_until });
  } catch (err) {
    console.error("[redeem-gift] error", err);
    return json({ error: (err as Error).message }, 500);
  }
});
