import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const MEDALLION_URL = supabase.storage.from("button").getPublicUrl("ew.vector.svg").data.publicUrl;

interface MessageData {
  sender_name: string | null;
  recipient_name: string | null;
  message_text: string;
  visual_emoji: string | null;
  visual_image_url: string | null;
  opened_at: string | null;
}

export default function MessageReveal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<MessageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [opening, setOpening] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: row, error } = await supabase
        .from("message_tokens")
        .select("sender_name, recipient_name, message_text, visual_emoji, visual_image_url, opened_at")
        .eq("token", token)
        .maybeSingle();
      if (error || !row) { setNotFound(true); setLoading(false); return; }
      setData(row);
      setLoading(false);
      if (!row.opened_at) {
        await supabase.from("message_tokens").update({ opened_at: new Date().toISOString() }).eq("token", token);
      }
    })();
  }, [token]);

  const handleOpen = () => {
    if (opening || revealed) return;
    setOpening(true);
    setTimeout(() => setRevealed(true), 1200);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
      <div style={{ width: 48, height: 48, border: "3px solid #c9a84c44", borderTopColor: "#c9a84c", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#f5f0e8", fontFamily: "'Georgia', serif", padding: 24 }}>
      <img src={MEDALLION_URL} alt="" style={{ width: 64, height: 64, marginBottom: 24, opacity: 0.5 }} />
      <p style={{ fontSize: 18 }}>This letter has expired or could not be found.</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap');

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes floatEnvelope {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes glimmer {
          0%, 100% { box-shadow: 0 0 24px rgba(201,168,76,0.3), 0 0 48px rgba(201,168,76,0.1); }
          50% { box-shadow: 0 0 40px rgba(201,168,76,0.6), 0 0 80px rgba(201,168,76,0.2); }
        }
        @keyframes flapOpen {
          0% { transform: rotateX(0deg); }
          100% { transform: rotateX(-180deg); }
        }
        @keyframes envelopeRise {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-60px) scale(0.9); opacity: 0; }
        }
        @keyframes letterRise {
          0% { transform: translateY(40px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .envelope-wrapper {
          animation: floatEnvelope 3s ease-in-out infinite, glimmer 3s ease-in-out infinite;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .envelope-wrapper:active { transform: scale(0.97); }
        .envelope-wrapper.opening {
          animation: envelopeRise 0.8s ease-in 0.4s forwards;
        }
        .flap {
          transform-origin: top center;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .flap.open {
          animation: flapOpen 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .letter-card {
          animation: letterRise 0.7s ease 0.5s both;
        }
        .gold-shimmer {
          background: linear-gradient(90deg, #c9a84c, #f5d07a, #c9a84c, #e8c96a, #c9a84c);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .tap-hint {
          animation: fadeInUp 0.6s ease 1.5s both;
        }
      `}</style>

      {!revealed ? (
        <div style={{ textAlign: "center", maxWidth: 400 }}>

          <div style={{ marginBottom: 40 }}>
            <p style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 28,
              fontWeight: 700,
              color: "#c9a84c",
              margin: "0 0 4px",
              lineHeight: 1.2,
            }}>
              {data?.recipient_name ? `${data.recipient_name},` : ""}
            </p>
            <p style={{
              fontFamily: "'Georgia', serif",
              fontSize: 16,
              color: "#888888",
              margin: 0,
            }}>
              you have something waiting
            </p>
          </div>

          {/* ENVELOPE */}
          <div
            className={`envelope-wrapper${opening ? " opening" : ""}`}
            onClick={handleOpen}
            style={{ position: "relative", width: 260, height: 180, margin: "0 auto", perspective: 800 }}
          >
            {/* Envelope body */}
            <div style={{
              position: "absolute", inset: 0, background: "linear-gradient(145deg, #1a1a1a, #111111)",
              borderRadius: 12, border: "1px solid #c9a84c44",
            }} />

            {/* Bottom V fold lines */}
            <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "100%" }} viewBox="0 0 260 180" fill="none">
              <line x1="0" y1="180" x2="130" y2="90" stroke="#c9a84c33" strokeWidth="1" />
              <line x1="260" y1="180" x2="130" y2="90" stroke="#c9a84c33" strokeWidth="1" />
            </svg>

            {/* Medallion on envelope body */}
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              zIndex: 2,
            }}>
              <img src={MEDALLION_URL} alt="" style={{ width: 48, height: 48, opacity: 0.7 }} />
            </div>

            {/* Flap (top triangle) */}
            <div className={`flap${opening ? " open" : ""}`} style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "50%", zIndex: 3,
            }}>
              <svg width="260" height="90" viewBox="0 0 260 90" fill="none" style={{ display: "block" }}>
                <path d="M0 0 H260 L130 90 Z" fill="#1a1a1a" stroke="#c9a84c44" strokeWidth="1" />
                <defs>
                  <linearGradient id="sealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#c9a84c" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Top edge gold line */}
            <div style={{
              position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, #c9a84c66, transparent)",
            }} />
          </div>

          <div className="tap-hint" style={{ marginTop: 32 }}>
            <p className="gold-shimmer" style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 17,
              fontWeight: 600,
              margin: 0,
            }}>
              {opening ? "Opening…" : "Tap to open"}
            </p>
          </div>
        </div>
      ) : (
        <div className="letter-card" style={{ maxWidth: 480, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <img src={MEDALLION_URL} alt="" style={{ width: 44, height: 44, margin: "0 auto", display: "block", opacity: 0.5 }} />
          </div>

          <div style={{
            background: "#111111",
            border: "1px solid #c9a84c44",
            borderRadius: 16,
            overflow: "hidden",
          }}>
            <div style={{
              height: 3,
              background: "linear-gradient(90deg, transparent, #c9a84c, transparent)",
            }}>
              <p className="gold-shimmer" style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 14,
                fontWeight: 600,
                textAlign: "center",
                margin: "12px 0 0",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}>
                An Encouraging Word
              </p>
            </div>

            <div style={{ padding: "32px 28px 28px" }}>
              {data?.visual_emoji && (
                <p style={{ fontSize: 56, textAlign: "center", margin: "0 0 16px", lineHeight: 1 }}>{data.visual_emoji}</p>
              )}
              {data?.visual_image_url && !data?.visual_emoji && (
                <img src={data.visual_image_url} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: 16 }} />
              )}
              {data?.recipient_name && (
                <p style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#c9a84c",
                  margin: "0 0 12px",
                }}>
                  Dear {data.recipient_name},
                </p>
              )}
              <p style={{
                fontFamily: "'Georgia', serif",
                fontSize: 18,
                lineHeight: 1.7,
                color: "#f5f0e8",
                whiteSpace: "pre-wrap",
                margin: "0 0 28px",
              }}>
                {data?.message_text}
              </p>
              <div style={{ borderTop: "1px solid #c9a84c22", paddingTop: 16 }}>
                <p style={{ fontFamily: "'Georgia', serif", fontSize: 14, color: "#777", margin: "0 0 4px" }}>With encouragement,</p>
                <p style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#c9a84c",
                  margin: 0,
                }}>
                  {data?.sender_name || "A friend"}
                </p>
              </div>
            </div>
          </div>

          <p style={{
            textAlign: "center",
            fontFamily: "'Georgia', serif",
            fontSize: 12,
            color: "#444",
            marginTop: 20,
          }}>
            Sent with Encouraging Words · sendencouragingwords.com
          </p>
        </div>
      )}
    </div>
  );
}
