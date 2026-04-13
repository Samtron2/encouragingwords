import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const MEDALLION_URL = supabase.storage.from("button").getPublicUrl("ew.vector.svg").data.publicUrl;

const THEME_PREVIEWS = [
  {
    label: "Light",
    bg: "#FAF7F2",
    primary: "#2D6E6E",
    card: "#FFFFFF",
    text: "#1C1C1C",
    accent: "#C97B84",
    sub: "Warm and inviting",
  },
  {
    label: "Classic",
    bg: "#1e2340",
    primary: "#c9a84c",
    card: "#252b4a",
    text: "#f5f0e8",
    accent: "#c9a84c",
    sub: "Deep and focused",
  },
  {
    label: "Royal",
    bg: "#0a0a0a",
    primary: "#c9a84c",
    card: "#111111",
    text: "#f7f7f7",
    accent: "#c9a84c",
    sub: "Bold and distinguished",
  },
];

function ThemeCard({ theme }: { theme: typeof THEME_PREVIEWS[number] }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-64 rounded-2xl p-5 shadow-lg border border-white/10"
        style={{ backgroundColor: theme.bg }}
      >
        <p
          className="text-[10px] font-bold tracking-widest mb-3 opacity-60"
          style={{ color: theme.text }}
        >
          {theme.label.toUpperCase()}
        </p>
        <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: theme.card }}>
          <p className="text-xs opacity-50 mb-1" style={{ color: theme.text }}>
            To: Sarah
          </p>
          <p className="text-sm leading-relaxed" style={{ color: theme.text }}>
            You've got this. I believe in you.
          </p>
        </div>
        <div
          className="rounded-full py-2 text-center text-xs font-bold"
          style={{ backgroundColor: theme.accent, color: theme.bg }}
        >
          Send
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{theme.sub}</p>
    </div>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1C1C]">

      {/* NAV */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <span className="font-display text-xl font-bold tracking-tight" style={{ color: "#2D6E6E" }}>
          Encouraging Words
        </span>
        <Link
          to="/auth"
          className="text-sm font-medium px-5 py-2 rounded-full border border-[#2D6E6E] transition-colors hover:bg-[#2D6E6E] hover:text-white"
          style={{ color: "#2D6E6E" }}
        >
          Sign in
        </Link>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24 flex flex-col md:flex-row items-center gap-12 md:gap-20">
        <div className="flex-1 max-w-xl">
          <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: "#C97B84" }}>
            Unum Accipere
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight mb-6">
            You mean to reach out.
            <br />
            We make sure you do.
          </h1>
          <p className="text-lg text-[#555] leading-relaxed mb-8">
            You already know who could use some encouragement today. The hard part isn't caring — it's the blank screen, the search for the right words, the feeling that a quick text isn't enough. Encouraging Words solves all of that in thirty seconds.
          </p>
          <Link
            to="/auth"
            className="inline-block rounded-full px-8 py-4 text-lg font-bold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#C97B84" }}
          >
            Start encouraging for free
          </Link>
          <p className="mt-4 text-sm text-[#999]">
            No credit card. No app store. Works on any device.
          </p>
        </div>

        <div className="flex-shrink-0 flex flex-col items-center gap-4">
          <img
            src={MEDALLION_URL}
            alt="Encouraging Words medallion"
            className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-lg"
          />
          <p className="text-sm italic text-[#999]">
            "That's Latin for get one."
          </p>
        </div>
      </section>

      {/* WHY IT WORKS */}
      <section className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center font-display text-2xl md:text-3xl font-bold leading-snug mb-2" style={{ color: "#2D6E6E" }}>
            You can do this through email. You can do it through text.
          </p>
          <p className="text-center text-lg text-[#888] mb-14">
            But you don't. Here's why we're different.
          </p>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                emoji: "💬",
                title: "The blank screen problem",
                body: "Opening a text app means staring at nothing. We give you beautiful prompts, rotating visuals, and the right words to get started — so the hard part is already done.",
              },
              {
                emoji: "🎯",
                title: "Intentional, not reactive",
                body: "Texting is what happens when someone texts you first. Encouraging Words is what happens when you decide to make someone's day. It's a different feeling — for you and for them.",
              },
              {
                emoji: "🎁",
                title: "It feels like a gift",
                body: "Recipients don't get a plain message. They get a moment — a beautifully presented encouraging word that feels personal, thoughtful, and real. No app required to receive it.",
              },
            ].map((item) => (
              <div key={item.title} className="text-center md:text-left">
                <p className="text-4xl mb-4">{item.emoji}</p>
                <h3 className="font-display text-lg font-bold mb-2" style={{ color: "#1C1C1C" }}>
                  {item.title}
                </h3>
                <p className="text-[#666] leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-6">
        <h2 className="text-center font-display text-2xl md:text-3xl font-bold mb-14" style={{ color: "#2D6E6E" }}>
          Thirty seconds. That's all it takes.
        </h2>
        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-8">
          {[
            { step: "1", label: "Choose who", body: "Type a name. Pick from your saved contacts. Done." },
            { step: "2", label: "Pick a visual", body: "Fresh rotating visuals every day. Or add your own photo." },
            { step: "3", label: "Write your word", body: "Use a prompt chip or write your own. 160 characters or less." },
            { step: "4", label: "Send it", body: "Email or text. They receive something beautiful. You feel great." },
          ].map((item) => (
            <div key={item.step} className="flex gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: "#2D6E6E" }}
              >
                {item.step}
              </div>
              <div>
                <h4 className="font-display font-bold text-lg mb-1">
                  {item.label}
                </h4>
                <p className="text-[#666]">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* THEME SHOWCASE */}
      <section className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-sm font-semibold tracking-widest uppercase mb-2" style={{ color: "#C97B84" }}>
            Make it yours
          </p>
          <h2 className="text-center font-display text-2xl md:text-3xl font-bold mb-12" style={{ color: "#2D6E6E" }}>
            Three themes. One purpose.
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-10">
            {THEME_PREVIEWS.map((t) => <ThemeCard key={t.label} theme={t} />)}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 px-6 text-center" style={{ backgroundColor: "#2D6E6E" }}>
        <img src={MEDALLION_URL} alt="" className="w-16 h-16 mx-auto mb-6 opacity-80" />
        <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
          Someone needs to hear from you today.
        </h2>
        <p className="text-white/80 text-lg max-w-lg mx-auto mb-8">
          It takes thirty seconds. It lasts all day. And it costs you nothing to start.
        </p>
        <Link
          to="/auth"
          className="inline-block rounded-full px-8 py-4 text-lg font-bold transition-colors hover:opacity-90"
          style={{ backgroundColor: "#C97B84", color: "#FFFFFF" }}
        >
          Start encouraging for free
        </Link>
        <p className="mt-6 text-white/50 text-sm italic">
          Unum Accipere — "That's Latin for get one."
        </p>
      </section>

      {/* FOOTER */}
      <footer className="py-8 text-center text-sm text-[#999]">
        <p>Encouraging Words · Built with care in Minneapolis, Minnesota</p>
      </footer>

    </div>
  );
}
