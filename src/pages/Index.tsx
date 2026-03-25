import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Send, Sparkles } from "lucide-react";
import MessageComposer from "@/components/MessageComposer";
import BottomNav, { type Tab } from "@/components/BottomNav";
import SettingsScreen from "@/components/SettingsScreen";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("home");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Heart className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {activeTab === "home" && (
        <>
          <header className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              <span className="font-display text-lg font-semibold">Encouraging Words</span>
            </div>
          </header>

          <main className="flex flex-1 flex-col items-center justify-center px-6 pb-28">
            <div className="max-w-md text-center animate-fade-in">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h1 className="font-display text-4xl font-semibold tracking-tight">
                Brighten someone's day
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Send a short, heartfelt message to someone you care about.
                It only takes a moment to make someone smile.
              </p>
              <div className="mt-8">
                <Button size="lg" className="gap-2 shadow-glow" onClick={() => setActiveTab("send")}>
                  <Send className="h-4 w-4" />
                  Send an encouraging word
                </Button>
              </div>
            </div>
          </main>
        </>
      )}

      {activeTab === "send" && (
        <MessageComposer onBack={() => setActiveTab("home")} />
      )}

      {activeTab === "settings" && <SettingsScreen />}

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
};

export default Index;
