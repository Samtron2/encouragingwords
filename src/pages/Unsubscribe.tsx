import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle, Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    (async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: anonKey } }
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
        } else if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
        } else {
          setStatus("valid");
        }
      } catch {
        setStatus("invalid");
      }
    })();
  }, [token]);

  const handleUnsubscribe = async () => {
    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error || data?.error) {
        setStatus("error");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already");
      } else {
        setStatus("success");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "loading" && (
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        )}
        {status === "valid" && (
          <>
            <h1 className="font-display text-3xl font-bold text-primary">Unsubscribe</h1>
            <p className="text-muted-foreground text-lg">
              Would you like to unsubscribe from Encouraging Words emails?
            </p>
            <Button
              onClick={handleUnsubscribe}
              className="rounded-full bg-primary text-primary-foreground font-bold px-8 h-14 text-lg"
            >
              Confirm Unsubscribe
            </Button>
          </>
        )}
        {status === "success" && (
          <>
            <Check className="h-12 w-12 text-accent mx-auto" />
            <h1 className="font-display text-3xl font-bold text-primary">Unsubscribed</h1>
            <p className="text-muted-foreground text-lg">
              You won't receive any more emails from us.
            </p>
          </>
        )}
        {status === "already" && (
          <>
            <Check className="h-12 w-12 text-muted-foreground mx-auto" />
            <h1 className="font-display text-3xl font-bold text-primary">Already unsubscribed</h1>
            <p className="text-muted-foreground text-lg">
              This email address has already been unsubscribed.
            </p>
          </>
        )}
        {(status === "invalid" || status === "error") && (
          <>
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="font-display text-3xl font-bold text-primary">
              {status === "invalid" ? "Invalid link" : "Something went wrong"}
            </h1>
            <p className="text-muted-foreground text-lg">
              {status === "invalid"
                ? "This unsubscribe link is invalid or has expired."
                : "Please try again later."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
