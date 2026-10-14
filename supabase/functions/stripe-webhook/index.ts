// Dormant while BILLING_ENABLED !== "true". See src/lib/billing.ts.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { enqueueTemplateEmail } from "../_shared/enqueue-template-email.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (Deno.env.get("BILLING_ENABLED") !== "true") {
    console.log("[stripe-webhook] disabled");
    return json({ disabled: true, message: "Billing is not enabled yet." });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) {
      console.error("[stripe-webhook] missing stripe secrets");
      return json({ error: "Stripe not configured" }, 500);
    }

    const Stripe = (await import("npm:stripe@14")).default;
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const signature = req.headers.get("stripe-signature");
    if (!signature) return json({ error: "Missing signature" }, 400);

    const body = await req.text();
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("[stripe-webhook] bad signature", err);
      return json({ error: "Invalid signature" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    console.log("[stripe-webhook] event", event.type);

    const upsertFromSubscription = async (sub: any) => {
      const userId = sub.metadata?.user_id;
      if (!userId) {
        console.warn("[stripe-webhook] subscription missing user_id metadata", sub.id);
        return;
      }
      await admin.from("subscriptions").upsert(
        {
          user_id: userId,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
          status: sub.status,
          plan_interval: sub.items?.data?.[0]?.price?.recurring?.interval ?? null,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: !!sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    };

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await upsertFromSubscription(event.data.object);
        break;
      case "customer.subscription.deleted": {
        const sub: any = event.data.object;
        const userId = sub.metadata?.user_id;
        if (userId) {
          await admin
            .from("subscriptions")
            .update({
              status: "canceled",
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }
        break;
      }
      case "checkout.session.completed": {
        const session: any = event.data.object;
        if (session.metadata?.kind !== "gift" || session.payment_status !== "paid") break;
        const giftId = session.metadata?.gift_id;
        if (!giftId) break;
        // Only transitions pending -> paid, so retries never send twice.
        const { data: paid, error: paidErr } = await admin
          .from("gifts")
          .update({
            status: "paid",
            stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
            paid_at: new Date().toISOString(),
          })
          .eq("id", giftId)
          .eq("status", "pending")
          .select("id, purchaser_name, recipient_name, recipient_email, note, redeem_token");
        if (paidErr) {
          console.error("[stripe-webhook] gift update failed", paidErr);
          break;
        }
        const gift = paid?.[0];
        if (!gift) {
          console.log("[stripe-webhook] gift already processed", giftId);
          break;
        }
        const result = await enqueueTemplateEmail(admin, {
          templateName: "gift-received",
          recipientEmail: gift.recipient_email,
          idempotencyKey: `gift-received-${gift.id}`,
          templateData: {
            purchaserName: gift.purchaser_name,
            recipientName: gift.recipient_name,
            note: gift.note || undefined,
            claimUrl: `https://sendencouragingwords.com/gift/${gift.redeem_token}`,
          },
        });
        console.log("[stripe-webhook] gift email", { giftId, ...result });
        break;
      }
      case "charge.refunded": {
        const charge: any = event.data.object;
        const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (!pi) break;
        const { data: gift } = await admin
          .from("gifts")
          .select("id, status")
          .eq("stripe_payment_intent_id", pi)
          .maybeSingle();
        if (!gift) break;
        await admin
          .from("gifts")
          .update(
            gift.status === "redeemed"
              ? { status: "refunded", access_until: new Date().toISOString() }
              : { status: "refunded" },
          )
          .eq("id", gift.id);
        console.log("[stripe-webhook] gift refunded", gift.id);
        break;
      }
      default:
        break;
    }

    return json({ received: true });
  } catch (err) {
    console.error("[stripe-webhook] error", err);
    return json({ error: (err as Error).message }, 500);
  }
});
