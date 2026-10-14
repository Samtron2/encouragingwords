import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMembership, notifyMembershipChanged } from "@/hooks/useMembership";
import { PENDING_GIFT_KEY } from "@/hooks/useCheckoutReturn";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import medallionLogo from "@/assets/encouraging-words-logo.png";

interface GiftPreview {
  purchaser_name: string;
  recipient_name: string;
  note: string | null;
  status: "pending" | "paid" | "redeemed" | "refunded";
}

const gold = "#c9a84c";
const cream = "#f0ead8";

export default function GiftClaim() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { reason } = useMembership();
  const [gift, setGift] = useState<GiftPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimedNow, setClaimedNow] = useState(false);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase.rpc("get_gift_preview", { _token: token });
      if (!error && data) setGift(data as unknown as GiftPreview);
      setLoading(false);
    })();
  }, [token]);

  const goSignUp = () => {
    try { localStorage.setItem(PENDING_GIFT_KEY, token ?? ""); } catch {}
    navigate("/auth");
  };

  const claim = async () => {
    setClaiming(true);
    const { error } = await supabase.functions.invoke("redeem-gift", { body: { token } });
    if (error) {
      const status = (error as { context?: Response }).context?.status;
      if (status === 409) {
        setGift((g) => (g ? { ...g, status: "redeemed" } : g));
        setClaimedNow(true);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      setClaiming(false);
      return;
    }
    notifyMembershipChanged();
    toast.success("Your year of Encouraging Words starts now.");
    navigate("/", { replace: true });
  };

  const button = (label: string, onClick: () => void, busy = false) => (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        marginTop: 28, background: gold, color: "#0a0a0a", border: "none", borderRadius: 999,
        padding: "14px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 8, opacity: busy ? 0.7 : 1,
      }}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );

  const message = (text: string) => (
    <p style={{ color: cream, fontSize: 20, lineHeight: 1.6, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>{text}</p>
  );

  let content: React.ReactNode;
  if (loading || authLoading) {
    content = <Loader2 className="h-6 w-6 animate-spin" style={{ color: gold, margin: "0 auto" }} />;
  } else if (!gift) {
    content = message("This gift link doesn't look right. Check the email it came in.");
  } else if (gift.status === "pending") {
    content = message("This gift isn't ready yet. Try the link again in a minute.");
  } else if (gift.status === "refunded") {
    content = message("This gift is no longer available.");
  } else if (gift.status === "redeemed" || claimedNow) {
    content = (
      <>
        {message("This gift has already been claimed.")}
        {button("Go to Encouraging Words", () => navigate("/"))}
      </>
    );
  } else {
    content = (
      <>
        <p style={{ color: gold, fontSize: 26, fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", margin: 0 }}>
          From {gift.purchaser_name}
        </p>
        {gift.note && (
          <p style={{
            color: cream, fontSize: 22, lineHeight: 1.6, fontStyle: "italic", whiteSpace: "pre-wrap",
            fontFamily: "'Cormorant Garamond', Georgia, serif", borderLeft: `2px solid ${gold}`,
            textAlign: "left", padding: "0 0 0 16px", margin: "24px 0 0",
          }}>
            {gift.note}
          </p>
        )}
        <p style={{ color: "#d8d0bc", fontSize: 17, lineHeight: 1.6, marginTop: 24 }}>
          One year of Encouraging Words. Unlimited words to anyone you like.
        </p>
        {user ? (
          <>
            {reason === "subscription" && (
              <p style={{ color: "#a89f8a", fontSize: 14, lineHeight: 1.5, marginTop: 20 }}>
                You already have a membership. You can still claim this. If you like, cancel your paid plan from Settings.
              </p>
            )}
            {button("Claim my year", claim, claiming)}
          </>
        ) : (
          button("Create your account to claim it", goSignUp)
        )}
      </>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      background: "radial-gradient(ellipse at center, #1a1408 0%, #0a0a0a 70%)",
    }}>
      <div style={{
        textAlign: "center", maxWidth: 440, width: "100%", padding: "40px 28px", borderRadius: 16,
        border: `1px solid ${gold}66`, background: "#0f0f0f", boxShadow: `0 0 40px ${gold}22`,
      }}>
        <img src={medallionLogo} alt="Encouraging Words" style={{ width: 96, height: 96, margin: "0 auto 20px", display: "block" }} />
        {content}
      </div>
    </div>
  );
}
