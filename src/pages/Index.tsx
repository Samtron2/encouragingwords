import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Send, Sparkles, CalendarHeart } from "lucide-react";
import MessageComposer, { type PrefilledRecipient } from "@/components/MessageComposer";
import BottomNav, { type Tab } from "@/components/BottomNav";
import SettingsScreen from "@/components/SettingsScreen";
import { supabase } from "@/integrations/supabase/client";

interface UpcomingReminder {
  name: string;
  occasion_type: string;
  days_away: number;
  contact_id: string | null;
}

function useUpcomingDates(userId: string | undefined) {
  const [reminders, setReminders] = useState<UpcomingReminder[]>([]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("important_dates")
        .select("name, month, day, occasion_type, contact_id")
        .eq("user_id", userId);

      if (!data) return;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const upcoming: UpcomingReminder[] = [];

      for (const d of data) {
        // Build date for this year
        let dateThisYear = new Date(now.getFullYear(), d.month - 1, d.day);
        // If it already passed, check next year (but only within 7 days)
        if (dateThisYear < today) {
          dateThisYear = new Date(now.getFullYear() + 1, d.month - 1, d.day);
        }
        const diff = Math.round(
          (dateThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff >= 0 && diff <= 7) {
          upcoming.push({
            name: d.name,
            occasion_type: d.occasion_type,
            days_away: diff,
            contact_id: d.contact_id,
          });
        }
      }

      upcoming.sort((a, b) => a.days_away - b.days_away);
      setReminders(upcoming);
    })();
  }, [userId]);

  return reminders;
}

const Index = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [composerPrefill, setComposerPrefill] = useState<PrefilledRecipient | undefined>();
  const reminders = useUpcomingDates(user?.id);

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

  const handleSendNow = async (reminder: UpcomingReminder) => {
    const prefill: PrefilledRecipient = { name: reminder.name };

    // If linked to a contact, fetch their email/phone
    if (reminder.contact_id) {
      const { data } = await supabase
        .from("recipients")
        .select("email, phone")
        .eq("id", reminder.contact_id)
        .single();
      if (data) {
        if (data.email) prefill.email = data.email;
        if (data.phone) prefill.phone = data.phone;
      }
    }

    setComposerPrefill(prefill);
    setActiveTab("send");
  };

  const switchTab = (tab: Tab) => {
    if (tab !== "send") setComposerPrefill(undefined);
    setActiveTab(tab);
  };

  const daysLabel = (days: number) => {
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    return `in ${days} days`;
  };

  const occasionLabel = (type: string) => type.toLowerCase();

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
            <div className="max-w-md w-full text-center animate-fade-in">
              {/* Upcoming reminders */}
              {reminders.length > 0 && (
                <div className="mb-8 space-y-3 text-left">
                  {reminders.map((r, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border bg-card p-4 shadow-soft flex items-center gap-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15">
                        <CalendarHeart className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">
                          {r.name}'s {occasionLabel(r.occasion_type)} is{" "}
                          <span className="text-primary font-semibold">{daysLabel(r.days_away)}</span>.
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Send her an encouraging word?
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0 shadow-glow"
                        onClick={() => handleSendNow(r)}
                      >
                        Send now
                      </Button>
                    </div>
                  ))}
                </div>
              )}

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
                <Button size="lg" className="gap-2 shadow-glow" onClick={() => switchTab("send")}>
                  <Send className="h-4 w-4" />
                  Send an encouraging word
                </Button>
              </div>
            </div>
          </main>
        </>
      )}

      {activeTab === "send" && (
        <MessageComposer onBack={() => switchTab("home")} prefill={composerPrefill} />
      )}

      {activeTab === "settings" && <SettingsScreen />}

      <BottomNav active={activeTab} onChange={switchTab} />
    </div>
  );
};

export default Index;
