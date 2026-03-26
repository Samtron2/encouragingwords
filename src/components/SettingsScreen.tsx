import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Camera, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ImportantDates from "@/components/ImportantDates";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [sendToUniverse, setSendToUniverse] = useState(false);
  const [birthdayReminders, setBirthdayReminders] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, profile_photo, send_to_universe")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setDisplayName(data.display_name || "");
        setProfilePhoto(data.profile_photo || null);
        setSendToUniverse(data.send_to_universe ?? false);
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
        <h2 className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">
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
                className="text-sm text-accent hover:underline"
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
        <h2 className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">
          Preferences
        </h2>
        <div className="rounded-2xl bg-card p-6 space-y-5 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-base font-medium">Send to the Universe</p>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                Occasionally send a word of hope out into the world.
              </p>
            </div>
            <Switch
              checked={sendToUniverse}
              onCheckedChange={(v) => updateField(setSendToUniverse, v)}
              className="data-[state=checked]:bg-accent"
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-base font-medium">Birthday reminders</p>
            </div>
            <Switch
              checked={birthdayReminders}
              onCheckedChange={setBirthdayReminders}
              className="data-[state=checked]:bg-accent"
            />
          </div>

          <div className="border-t border-border" />

          <ImportantDates />
        </div>
      </section>

      {/* ABOUT */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">
          About
        </h2>
        <div className="rounded-2xl bg-card p-6 shadow-card space-y-2">
          <div className="flex justify-between">
            <span className="text-base text-muted-foreground">Version</span>
            <span className="text-base font-medium">1.0.0</span>
          </div>
          <p className="text-base text-muted-foreground">Made with heart in Minneapolis.</p>
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
