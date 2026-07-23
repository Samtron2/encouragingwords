import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useTheme } from "@/hooks/useTheme";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Send, CalendarHeart, Check } from "lucide-react";
import logo from "@/assets/encouraging-words-logo.png";
import MessageComposer, { type PrefilledRecipient } from "@/components/MessageComposer";
import BottomNav, { type Tab } from "@/components/BottomNav";
import SettingsScreen from "@/components/SettingsScreen";
import AdminPanel from "@/components/admin/AdminPanel";
import PeopleScreen from "@/components/PeopleScreen";
import { supabase } from "@/integrations/supabase/client";

function useGreeting(userId: string | undefined) {
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
      });
  }, [userId]);

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return displayName ? `${timeOfDay}, ${displayName}` : timeOfDay;
}

function useWordsSentCount(userId: string | undefined) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["sent", "initiated"])
      .then(({ count: c }) => {
        setCount(c ?? 0);
      });
  }, [userId]);

  if (count === null) return null;
  if (count === 0) return "Send your first encouraging word today.";
  if (count === 1) return "You've sent 1 encouraging word. Keep it up.";
  if (count <= 10) return `You've sent ${count} encouraging words. That matters.`;
  return `You've sent ${count} encouraging words. You're making a difference.`;
}

interface UpcomingReminder {
  name: string;
  occasion_type: string;
  days_away: number;
  contact_id: string | null;
}

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const remindersCache: { data: UpcomingReminder[]; fetchedAt: number; userId: string } | null = null;
let remindersCacheRef = remindersCache;

function useUpcomingDates(userId: string | undefined) {
  const [reminders, setReminders] = useState<UpcomingReminder[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Return cached data if fresh
    if (
      remindersCacheRef &&
      remindersCacheRef.userId === userId &&
      Date.now() - remindersCacheRef.fetchedAt < STALE_TIME
    ) {
      setReminders(remindersCacheRef.data);
      return;
    }

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
        let dateThisYear = new Date(now.getFullYear(), d.month - 1, d.day);
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
      remindersCacheRef = { data: upcoming, fetchedAt: Date.now(), userId };
      setReminders(upcoming);
    })();
  }, [userId]);

  return reminders;
}

interface RecentWord {
  id: string;
  recipientName: string;
  method: "email" | "sms_native" | string;
  createdAt: string;
  opened: boolean;
}

function useRecentWords(userId: string | undefined) {
  const [items, setItems] = useState<RecentWord[]>([]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, recipient_id, delivery_method, status, created_at, reveal_token")
        .eq("user_id", userId)
        .neq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(3);

      if (!msgs || msgs.length === 0) {
        setItems([]);
        return;
      }

      const recipientIds = Array.from(
        new Set(msgs.map((m) => m.recipient_id).filter(Boolean) as string[])
      );
      const tokens = Array.from(
        new Set(msgs.map((m) => m.reveal_token).filter(Boolean) as string[])
      );

      const [recipRes, tokenRes] = await Promise.all([
        recipientIds.length
          ? supabase.from("recipients").select("id, name").in("id", recipientIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        tokens.length
          ? supabase
              .from("message_tokens")
              .select("token, recipient_name, opened_at")
              .in("token", tokens)
          : Promise.resolve({
              data: [] as { token: string; recipient_name: string | null; opened_at: string | null }[],
            }),
      ]);

      const recipMap = new Map((recipRes.data ?? []).map((r) => [r.id, r.name]));
      const tokenMap = new Map(
        (tokenRes.data ?? []).map((t) => [t.token, t])
      );

      setItems(
        msgs.map((m) => {
          const tokenRow = m.reveal_token ? tokenMap.get(m.reveal_token) : undefined;
          const name =
            (m.recipient_id && recipMap.get(m.recipient_id)) ||
            tokenRow?.recipient_name ||
            "A friend";
          return {
            id: m.id,
            recipientName: name,
            method: m.delivery_method,
            createdAt: m.created_at,
            opened: !!tokenRow?.opened_at,
          };
        })
      );
    })();
  }, [userId]);

  return items;
}

const TAB_KEY = "ew-active-tab";

function getRestoredTab(): Tab {
  try {
    const saved = localStorage.getItem(TAB_KEY) as Tab | null;
    if (saved && ["home", "send", "people", "settings", "admin"].includes(saved)) return saved;
  } catch {}
  return "home";
}

const Index = () => {
  const { user, loading } = useAuth();
  const { isAdmin } = useAdmin();
  const { theme } = useTheme(); // Load & apply profile theme immediately on auth
  const [activeTab, setActiveTab] = useState<Tab>(getRestoredTab);
  const [composerPrefill, setComposerPrefill] = useState<PrefilledRecipient | undefined>();

  // Persist active tab
  useEffect(() => {
    try { localStorage.setItem(TAB_KEY, activeTab); } catch {}
  }, [activeTab]);
  const reminders = useUpcomingDates(user?.id);
  const greeting = useGreeting(user?.id);
  const wordsSentMessage = useWordsSentCount(user?.id);
  const recentWords = useRecentWords(user?.id);

  const methodLabel = (m: string) => (m === "sms_native" ? "Text" : m === "email" ? "Email" : "Sent");
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleSendNow = async (reminder: UpcomingReminder) => {
    const prefill: PrefilledRecipient = { name: reminder.name };

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
    <div className="relative flex min-h-screen flex-col">
      <div className="bg-decoration" />

      <div className="relative z-10 flex min-h-screen flex-col">
        {activeTab === "home" && (
          <>
            <main className="flex flex-col items-center justify-between px-6 pb-28 min-h-[calc(100vh-4rem)]">
              {/* Top section — greeting + stats */}
              <div className="max-w-md w-full text-center pt-10 space-y-3">
                <h1 className="font-display text-6xl font-bold text-primary leading-tight mt-0">
                  {greeting}
                </h1>

                {wordsSentMessage && (
                  <p className="font-display text-2xl text-primary/70 font-semibold mt-3">
                    {wordsSentMessage}
                  </p>
                )}
              </div>

              {/* Middle section — reminders */}
              <div className="flex-1 flex items-center max-w-md w-full">
                {reminders.length > 0 && (
                  <div className="space-y-3 text-left w-full">
                    {reminders.map((r, i) => (
                      <div
                        key={i}
                        className="rounded-2xl bg-card p-5 shadow-card flex items-center gap-4"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15">
                          <CalendarHeart className="h-5 w-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium leading-snug">
                            {r.name}'s {occasionLabel(r.occasion_type)} is{" "}
                            <span className="text-accent font-semibold">{daysLabel(r.days_away)}</span>.
                          </p>
                          <p className="text-[15px] text-muted-foreground mt-0.5">
                            Send them an encouraging word?
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="shrink-0"
                          onClick={() => handleSendNow(r)}
                        >
                          Send now
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom section — CTA logo + tagline */}
              <div className="pb-8 flex flex-col items-center justify-center">
                <button
                  onClick={() => switchTab("send")}
                  aria-label="Send an encouraging word"
                  className="rounded-full transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  style={{
                    width: '52vw',
                    height: '52vw',
                    maxWidth: '210px',
                    maxHeight: '210px',
                  }}
                >
                  <img
                    src={logo}
                    alt="Encouraging Words"
                    className="w-full h-full object-contain"
                  />
                </button>
                <span className="font-display italic text-[18px] mt-4 text-center text-foreground">
                  Click here to brighten someone's day.
                </span>
              </div>
            </main>
          </>
        )}

        {activeTab === "send" && (
          <MessageComposer onBack={() => switchTab("home")} prefill={composerPrefill} />
        )}

        {activeTab === "people" && (
          <PeopleScreen
            onSelectContact={(prefill) => {
              setComposerPrefill(prefill);
              setActiveTab("send");
            }}
          />
        )}

        {activeTab === "settings" && <SettingsScreen />}

        {activeTab === "admin" && isAdmin && <AdminPanel />}

        <BottomNav active={activeTab} onChange={switchTab} isAdmin={isAdmin} />
      </div>
    </div>
  );
};

export default Index;
