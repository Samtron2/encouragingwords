import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }
    if (isSignUp && password.length < 6) {
      toast({ title: "Password too short", description: "Please choose a password with at least 6 characters.", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    if (isSignUp) {
      const { error } = await signUp(email, password);
      if (error) {
        toast({ title: "Oops!", description: error.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      navigate("/");
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Oops!", description: error.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      navigate("/");
    }

    setSubmitting(false);
  };

  return (
    <div className="relative flex min-h-screen justify-start items-start px-4 pt-16">
      <div className="bg-decoration" />
      <div className="relative z-10 w-full max-w-sm mx-auto animate-fade-in">
        <div className="mb-8 text-center">
          <h1 className="font-display text-5xl font-bold text-primary tracking-tight leading-tight">
            Encouraging Words
          </h1>
          <p className="mt-3 text-lg text-muted-foreground font-display italic">
            Because some things deserve more than a text.
          </p>
          <p className="mt-3 text-base text-muted-foreground">
            {isSignUp ? "Create your account to start spreading joy." : "Welcome back ☀️"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-lg">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-lg py-3"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-lg">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="text-lg py-3"
            />
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-lg">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="text-lg py-3"
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full rounded-full bg-accent text-accent-foreground font-bold text-lg py-6 shadow-glow hover:bg-accent/90"
            size="lg"
            disabled={submitting}
          >
            {submitting ? "One moment…" : isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-sm text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full rounded-full font-medium text-lg py-6"
          size="lg"
          onClick={async () => {
            const result = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: window.location.origin,
            });
            if (result.error) {
              toast({ title: "Sign-in failed", description: result.error.message, variant: "destructive" });
              return;
            }
            if (result.redirected) return;
            navigate("/");
          }}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-lg text-muted-foreground">
          {isSignUp ? "Already have an account?" : "New here?"}{" "}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setConfirmPassword(""); }}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
}
