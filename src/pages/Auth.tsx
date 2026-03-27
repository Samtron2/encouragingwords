import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isSignUp) {
      const { error } = await signUp(email, password);
      if (error) {
        toast({ title: "Oops!", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Welcome! 🎉", description: "Check your email to confirm your account." });
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Oops!", description: error.message, variant: "destructive" });
      } else {
        navigate("/");
      }
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
            {isSignUp ? "Create your account to start spreading joy" : "Welcome back ☀️"}
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
          <Button
            type="submit"
            className="w-full rounded-full bg-accent text-accent-foreground font-bold text-lg py-6 shadow-glow hover:bg-accent/90"
            size="lg"
            disabled={submitting}
          >
            {submitting ? "One moment…" : isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <p className="mt-6 text-center text-lg text-muted-foreground">
          {isSignUp ? "Already have an account?" : "New here?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
