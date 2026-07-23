import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Camera, Check, Bell, BellOff, Users, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ImportantDates from "@/components/ImportantDates";

const VAPID_PUBLIC_KEY =
  "BLJP8ASgicNq8Rx3uf7sIVlP2U0k0e5qvJrwAEazeAODMCrZUHG7mtbfajpZ6At2pFq6SNYYZuQW4ZVI0Q49F7M";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null) {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

function isStandalonePWA() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [sendToUniverse, setSendToUniverse] = useState(false);
  const [birthdayReminders, setBirthdayReminders] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Push notifications
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [pushBusy, setPushBusy] = useState(false);
  const [needsIosInstall, setNeedsIosInstall] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setPushSupported(supported);
    if (!supported) {
      if (isIosSafari() && !isStandalonePWA()) setNeedsIosInstall(true);
      return;
    }
    setPushPermission(Notification.permission);
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setPushSubscribed(!!sub);
    });
  }, []);

  const handleEnablePush = async () => {
    if (!user) return;
    if (isIosSafari() && !isStandalonePWA()) {
      setNeedsIosInstall(true);
      return;
    }
    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== "granted") {
        setPushBusy(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const json = sub.toJSON();
      const p256dh = json.keys?.p256dh || arrayBufferToBase64(sub.getKey("p256dh"));
      const auth = json.keys?.auth || arrayBufferToBase64(sub.getKey("auth"));

      // Remove any previous row with same endpoint, then insert
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      const { error } = await supabase.from("push_subscriptions").insert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh,
        auth,
      });
      if (error) throw error;

      setPushSubscribed(true);
      toast({ title: "Reminders on ✨" });

      // Fire a welcome push
      supabase.functions
        .invoke("send-push", {
          body: {
            user_id: user.id,
            title: "Encouraging Words",
            body: "You're all set. We'll remind you before important dates.",
            url: "/",
          },
        })
        .catch((e) => console.error("welcome push failed:", e));
    } catch (err: any) {
      console.error("enable push failed:", err);
      toast({ title: "Couldn't turn on reminders", description: err?.message, variant: "destructive" });
    } finally {
      setPushBusy(false);
    }
  };

  const handleDisablePush = async () => {
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setPushSubscribed(false);
      toast({ title: "Reminders turned off" });
    } catch (err: any) {
      console.error("disable push failed:", err);
      toast({ title: "Couldn't turn off", description: err?.message, variant: "destructive" });
    } finally {
      setPushBusy(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, profile_photo, send_to_universe, birthday_reminders")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setDisplayName(data.display_name || "");
        setProfilePhoto(data.profile_photo || null);
        setSendToUniverse(data.send_to_universe ?? false);
        setBirthdayReminders((data as any).birthday_reminders ?? true);
      }
      setLoaded(true);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        send_to_universe: sendToUniverse,
        birthday_reminders: birthdayReminders,
      })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    } else {
      setDirty(false);
      toast({ title: "Saved ✨" });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage
      .from("profile-photos")
      .getPublicUrl(path);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase
      .from("profiles")
      .update({ profile_photo: publicUrl })
      .eq("user_id", user.id);

    setProfilePhoto(publicUrl);
    toast({ title: "Photo updated ✨" });
  };

  const updateField = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setDirty(true);
  };

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center pb-20">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-6 pt-6 pb-24 animate-fade-in overflow-y-auto">
      <h1 className="font-display text-2xl font-bold text-primary mb-6">Settings</h1>

      {/* ACCOUNT */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
          Account
        </h2>
        <div className="rounded-2xl bg-card p-6 space-y-5 shadow-card">
          <div className="flex items-center gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative group shrink-0"
            >
              <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center overflow-hidden ring-2 ring-border">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-display text-muted-foreground">
                    {(displayName || user?.email || "?")[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
                <Camera className="h-4 w-4 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
            <div className="min-w-0">
              <p className="text-base font-medium">Profile photo</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[15px] text-accent hover:underline"
              >
                Tap to change
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          <div>
            <label className="text-base font-medium text-muted-foreground mb-1.5 block">
              Display name
            </label>
            <Input
              value={displayName}
              onChange={(e) => updateField(setDisplayName, e.target.value)}
              placeholder="Your name"
              className="text-base"
            />
          </div>

          <div>
            <label className="text-base font-medium text-muted-foreground mb-1.5 block">
              Email
            </label>
            <Input
              value={user?.email || ""}
              readOnly
              className="bg-muted cursor-not-allowed text-base"
            />
          </div>
        </div>
      </section>

      {/* PREFERENCES */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
          Preferences
        </h2>
        <div className="rounded-2xl bg-card p-6 space-y-5 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-base font-medium">Important date reminders</p>
            </div>
            <Switch
              checked={birthdayReminders}
              onCheckedChange={(v) => updateField(setBirthdayReminders, v)}
              className="data-[state=checked]:bg-accent"
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-base font-medium">Theme</p>
            </div>
            <div className="flex gap-1.5">
              {(["light", "dark", "royal"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                    theme === t
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "royal" ? "Royal" : t === "light" ? "Light" : "Classic"}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border" />

          <ImportantDates />
        </div>
      </section>

      {/* REMINDERS */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
          Reminders
        </h2>
        <div className="rounded-2xl bg-card p-6 shadow-card space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15">
              <Bell className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium">Get reminded before important dates</p>
              <p className="text-[14px] text-muted-foreground mt-0.5">
                We'll send a gentle nudge so you never miss a moment.
              </p>
            </div>
          </div>

          {needsIosInstall ? (
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              To get reminders on iPhone, first add Encouraging Words to your Home Screen:
              tap the <span className="font-medium text-foreground">Share</span> button,
              then <span className="font-medium text-foreground">"Add to Home Screen"</span>.
              Then come back here.
            </p>
          ) : !pushSupported ? (
            <p className="text-[14px] text-muted-foreground">
              This browser doesn't support push notifications.
            </p>
          ) : pushPermission === "denied" ? (
            <p className="text-[14px] text-muted-foreground">
              Notifications are blocked in your browser settings. Allow them for this
              site to turn on reminders.
            </p>
          ) : pushSubscribed ? (
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                <Check className="h-4 w-4" />
                Reminders are on
              </span>
              <button
                onClick={handleDisablePush}
                disabled={pushBusy}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <BellOff className="h-4 w-4" />
                Turn off
              </button>
            </div>
          ) : (
            <button
              onClick={handleEnablePush}
              disabled={pushBusy}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-accent py-3 text-base font-bold text-accent-foreground shadow-glow transition-all hover:bg-accent/90 disabled:opacity-50"
            >
              {pushBusy ? (
                <div className="h-4 w-4 rounded-full border-2 border-accent-foreground border-t-transparent animate-spin" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              Turn on reminders
            </button>
          )}
        </div>
      </section>

      {/* ABOUT */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
          About
        </h2>
        <div className="rounded-2xl bg-card p-6 shadow-card space-y-2">
          <div className="flex justify-between">
            <span className="text-base text-muted-foreground">Version</span>
            <span className="text-base font-medium">1.0.0</span>
          </div>
          
        </div>
      </section>

      {/* SAVE BUTTON */}
      {dirty && (
        <div className="mb-6 animate-fade-in">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-accent py-4 text-base font-bold text-accent-foreground shadow-glow transition-all hover:bg-accent/90 disabled:opacity-50"
          >
            {saving ? (
              <div className="h-4 w-4 rounded-full border-2 border-accent-foreground border-t-transparent animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save changes
          </button>
        </div>
      )}

      {/* SIGN OUT */}
      <div className="mt-auto pt-4 pb-2 text-center">
        <button
          onClick={signOut}
          className="text-base text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
