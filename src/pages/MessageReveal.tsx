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
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: row, error } = await supabase
        .from("message_tokens")
        .select("sender_name, recipient_name, message_text, visual_emoji, visual_image_url, opened_at")
        .eq("token", token)
        .maybeSingle();

      if (error || !row) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setData(row);
      setLoading(false);

      if (!row.opened_at) {
        await supabase
          .from("message_tokens")
          .update({ opened_at: new Date().toISOString() })
          .eq("token", token);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
        <div style={{ width: 48, height: 48, border: "3px solid #c9a84c44", borderTopColor: "#c9a84c", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#f5f0e8", fontFamily: "'Georgia', serif", padding: 24 }}>
        <img src={MEDALLION_URL} alt="" style={{ width: 64, height: 64, marginBottom: 24, opacity: 0.5 }} />
        <p style={{ fontSize: 18 }}>This letter has expired or could not be found.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .reveal-card { animation: fadeIn 0.8s ease forwards; }
      `}</style>

      {!revealed ? (
        <div className="reveal-card" style={{ textAlign: "center", maxWidth: 400 }}>
          <img src={MEDALLION_URL} alt="Encouraging Words" style={{ width: 80, height: 80, margin: "0 auto 24px", display: "block" }} />

          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 28,
            fontWeight: 700,
            color: "#c9a84c",
            lineHeight: 1.3,
            margin: "0 0 8px",
          }}>
            {data?.recipient_name ? `${data.recipient_name}, you` : "You"} have received an Encouraging Word
          </h1>

          <p style={{
            fontFamily: "'Georgia', serif",
            fontSize: 16,
            color: "#888888",
            margin: "0 0 28px",
          }}>
            From {data?.sender_name || "a friend"}
          </p>

          <button
            onClick={() => setRevealed(true)}
            style={{
              marginTop: 8,
              background: "linear-gradient(135deg, #c9a84c, #e8c96a, #c9a84c)",
              color: "#0a0a0a",
              border: "none",
              borderRadius: 999,
              padding: "16px 40px",
              fontSize: 18,
              fontWeight: "bold",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              cursor: "pointer",
              boxShadow: "0 4px 24px rgba(201,168,76,0.4)",
            }}
          >
            Open your letter
          </button>
        </div>
      ) : (
        <div className="reveal-card" style={{ maxWidth: 480, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <img src={MEDALLION_URL} alt="" style={{ width: 48, height: 48, margin: "0 auto", display: "block", opacity: 0.6 }} />
          </div>

          <div style={{
            background: "#111111",
            border: "1px solid #c9a84c44",
            borderRadius: 16,
            padding: "32px 28px",
          }}>
            {data?.visual_emoji && (
              <p style={{ fontSize: 64, textAlign: "center", margin: "0 0 20px", lineHeight: 1 }}>{data.visual_emoji}</p>
            )}
            {data?.visual_image_url && !data?.visual_emoji && (
              <img src={data.visual_image_url} alt="" style={{ width: "100%", borderRadius: 12, marginBottom: 20 }} />
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

            <div style={{ borderTop: "1px solid #c9a84c33", paddingTop: 16 }}>
              <p style={{ fontFamily: "'Georgia', serif", fontSize: 14, color: "#888888", margin: "0 0 4px" }}>With encouragement,</p>
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

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <p style={{ fontFamily: "'Georgia', serif", fontSize: 12, color: "#555555" }}>
              Sent with Encouraging Words · sendencouragingwords.com
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
