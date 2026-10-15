import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type OAuthResult = { data: any; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const SCOPE_LABELS: Record<string, string> = {
  openid: "Confirm who you are",
  email: "Share your email address",
  profile: "Share your basic profile",
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("This connection link is missing or invalid.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      setEmail(sess.session.user.email ?? "");
      try {
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message || "This connection request has expired.");
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) { window.location.href = immediate; return; }
        setDetails(data);
      } catch {
        if (active) setError("We couldn't load this connection request. Please try again.");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      if (error) { setBusy(false); return setError(error.message); }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) { setBusy(false); return setError("Something went wrong finishing the connection."); }
      window.location.href = target;
    } catch {
      setBusy(false);
      setError(approve ? "We couldn't approve the connection. Please try again." : "We couldn't cancel the connection. Please try again.");
    }
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "An app";
  const redirect = details?.redirect_uri ?? details?.client?.redirect_uri;
  const scopes: string[] = String(details?.scope ?? details?.scopes ?? "").split(/[\s,]+/).filter(Boolean);

  return (
    <div className="relative flex min-h-screen items-start justify-center px-4 pt-16">
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-card p-6 shadow-card animate-fade-in">
        {error ? (
          <>
            <h1 className="font-display text-2xl font-bold text-primary mb-2">Connection unavailable</h1>
            <p className="text-muted-foreground">{error}</p>
          </>
        ) : !details ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold text-primary mb-2">
              Connect {clientName} to Encouraging Words
            </h1>
            <p className="text-muted-foreground mb-4">
              {clientName} will be able to see your people, important dates and recent words while you are signed in.
            </p>
            {email && <p className="text-sm mb-2">Signed in as <span className="font-medium">{email}</span></p>}
            {redirect && <p className="text-sm text-muted-foreground mb-3 break-all">Returns to {redirect}</p>}
            {scopes.length > 0 && (
              <ul className="text-sm mb-4 list-disc pl-5 space-y-1">
                {scopes.map((s) => <li key={s}>{SCOPE_LABELS[s] ?? `Additional permission requested: ${s}`}</li>)}
              </ul>
            )}
            <p className="text-xs text-muted-foreground mb-5">This does not bypass this app's permissions.</p>
            <div className="flex flex-col gap-2">
              <Button disabled={busy} onClick={() => decide(true)} className="rounded-full">Approve</Button>
              <Button disabled={busy} variant="outline" onClick={() => decide(false)} className="rounded-full">Cancel connection</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
