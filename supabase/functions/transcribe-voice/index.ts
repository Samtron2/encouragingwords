import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function extForMime(mime: string): string {
  const m = mime.split(";")[0].trim().toLowerCase();
  if (m === "audio/mp4" || m === "audio/m4a" || m === "audio/x-m4a") return "m4a";
  if (m === "audio/mpeg" || m === "audio/mp3") return "mp3";
  if (m === "audio/wav" || m === "audio/x-wav") return "wav";
  if (m === "audio/ogg") return "ogg";
  if (m === "audio/webm") return "webm";
  return "webm";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authed = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await authed.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { audio, mimeType } = body ?? {};
    if (!audio || typeof audio !== "string") {
      return new Response(JSON.stringify({ error: "Missing audio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mime = typeof mimeType === "string" && mimeType ? mimeType : "audio/webm";
    const ext = extForMime(mime);
    const bytes = base64ToBytes(audio);
    if (bytes.byteLength < 512) {
      return new Response(JSON.stringify({ error: "Recording was too short. Please try again." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Transcribe
    const form = new FormData();
    form.append("model", "openai/gpt-4o-transcribe");
    form.append("file", new Blob([bytes], { type: mime }), `recording.${ext}`);

    const sttRes = await fetch(`${GATEWAY}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: form,
    });
    if (!sttRes.ok) {
      const errText = await sttRes.text().catch(() => "");
      console.error("Transcription failed", sttRes.status, errText);
      const userMsg = sttRes.status === 402
        ? "AI credits are exhausted. Please try again later."
        : sttRes.status === 429
          ? "Too many requests. Please wait a moment and try again."
          : "Couldn't transcribe that recording. Please try again.";
      return new Response(JSON.stringify({ error: userMsg }), {
        status: sttRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sttJson = await sttRes.json();
    const rawText: string = (sttJson?.text ?? "").toString().trim();
    if (!rawText) {
      return new Response(JSON.stringify({ error: "Didn't catch that. Try recording again." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Polish
    const systemPrompt = `You are a gentle editor for short, heartfelt personal messages. You will receive a raw voice transcription. Return ONLY the cleaned message text, nothing else — no quotes, no preface, no commentary.

Rules:
- Fix punctuation, capitalization, and obvious speech artifacts (um, uh, like, you know, false starts, repeated words).
- Keep the sender's own words, voice, and tone. Do NOT add sentences. Do NOT embellish. Do NOT change the meaning.
- Keep the result at or under 160 characters. If the transcription is longer, condense faithfully rather than truncating mid-sentence.
- Never invent names, facts, or details that aren't in the transcription.`;

    const chatRes = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: rawText },
        ],
      }),
    });
    if (!chatRes.ok) {
      const errText = await chatRes.text().catch(() => "");
      console.error("Polish failed", chatRes.status, errText);
      // Fall back to raw text (trimmed to 160)
      const fallback = rawText.length > 160 ? rawText.slice(0, 157).trimEnd() + "…" : rawText;
      return new Response(JSON.stringify({ text: fallback }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const chatJson = await chatRes.json();
    let polished: string = (chatJson?.choices?.[0]?.message?.content ?? "").toString().trim();
    polished = polished.replace(/^["'“”]+|["'“”]+$/g, "").trim();
    if (!polished) polished = rawText;
    if (polished.length > 160) polished = polished.slice(0, 157).trimEnd() + "…";

    return new Response(JSON.stringify({ text: polished }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("transcribe-voice error", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
