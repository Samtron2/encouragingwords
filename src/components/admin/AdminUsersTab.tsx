import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Trash2, ChevronLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  subscription_status: string;
  profile_photo: string | null;
}

export default function AdminUsersTab() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfiles = async () => {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("id, user_id, display_name, email, created_at, subscription_status, profile_photo")
      .order("created_at", { ascending: false });

    if (search.trim()) {
      const q = `%${search.trim()}%`;
      query = query.or(`display_name.ilike.${q},email.ilike.${q}`);
    }

    const { data } = await query.limit(100);
    setProfiles((data as Profile[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadProfiles();
  }, [search]);

  const handleDelete = async (profile: Profile) => {
    if (!confirm(`Delete ${profile.display_name || profile.email}? This cannot be undone.`)) return;

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", profile.id);

    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "User removed" });
    setSelected(null);
    loadProfiles();
  };

  if (selected) {
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1 text-base text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to users
        </button>

        <div className="rounded-2xl bg-card p-6 shadow-card space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center overflow-hidden ring-2 ring-border">
              {selected.profile_photo ? (
                <img src={selected.profile_photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-display text-muted-foreground">
                  {(selected.display_name || selected.email || "?")[0].toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="text-base font-medium">{selected.display_name || "No name"}</p>
              <p className="text-base text-muted-foreground">{selected.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-base">
            <div>
              <p className="text-muted-foreground">Joined</p>
              <p className="font-medium">{format(new Date(selected.created_at), "MMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Plan</p>
              <p className="font-medium capitalize">{selected.subscription_status}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/5"
              onClick={() => handleDelete(selected)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 text-base"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : profiles.length === 0 ? (
        <p className="text-base text-muted-foreground text-center py-10">No users found.</p>
      ) : (
        <div className="space-y-1">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
            >
              <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0 text-base font-semibold text-muted-foreground">
                {(p.display_name || p.email || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium truncate">{p.display_name || "No name"}</p>
                <p className="text-sm text-muted-foreground truncate">{p.email}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm text-muted-foreground">
                  {format(new Date(p.created_at), "MMM d, yyyy")}
                </p>
                <p className="text-sm capitalize text-muted-foreground">{p.subscription_status}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
