import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

function daysUntil(month: number, day: number): number {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let next = new Date(Date.UTC(now.getUTCFullYear(), month - 1, day));
  if (next < today) {
    next = new Date(Date.UTC(now.getUTCFullYear() + 1, month - 1, day));
  }
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

function friendlyOccasion(t: string | null | undefined): string {
  if (!t) return "special day";
  return String(t).toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const provided = req.headers.get("x-cron-secret");
  if (!provided || provided !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: dates, error: datesErr } = await admin
      .from("important_dates")
      .select("id, user_id, name, month, day, occasion_type");
    if (datesErr) throw datesErr;

    let checked = 0;
    let matched = 0;
    let sent = 0;
    let removed = 0;

    for (const d of dates ?? []) {
      checked++;
      const days = daysUntil(d.month, d.day);
      if (days !== 0 && days !== 2) continue;
      matched++;

      const { data: subs, error: subsErr } = await admin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", d.user_id);
      if (subsErr) {
        console.error("subs fetch failed", subsErr);
        continue;
      }
      if (!subs?.length) continue;

      const occasion = friendlyOccasion(d.occasion_type);
      const title = days === 0 ? "It's today" : "Coming up";
      const body =
        days === 0
          ? `It's ${d.name}'s ${occasion} today. Make their day.`
          : `${d.name}'s ${occasion} is in 2 days. Send them a word.`;
      const payload = JSON.stringify({ title, body, url: "/" });

      for (const s of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
          sent++;
        } catch (err: any) {
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            await admin.from("push_subscriptions").delete().eq("id", s.id);
            removed++;
          } else {
            console.error("push failure:", status, err?.body || err?.message);
          }
        }
      }
    }

    return new Response(JSON.stringify({ checked, matched, sent, removed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-date-reminders error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
