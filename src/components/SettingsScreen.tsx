import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex flex-1 flex-col px-6 pt-6 pb-24 animate-fade-in">
      <h1 className="font-display text-2xl font-semibold mb-8">Settings</h1>

      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <p className="text-sm text-muted-foreground mb-1">Signed in as</p>
        <p className="text-sm font-medium truncate">{user?.email}</p>
      </div>

      <div className="mt-6">
        <Button variant="outline" className="w-full" onClick={signOut}>
          Sign out
        </Button>
      </div>

      <p className="mt-auto text-center text-xs text-muted-foreground pt-10">
        More settings coming soon ✨
      </p>
    </div>
  );
}
