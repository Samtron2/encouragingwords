import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Heart, Search, MoreVertical, Pencil, Trash2, UserPlus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { Tab } from "@/components/BottomNav";
import type { PrefilledRecipient } from "@/components/MessageComposer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const GOOGLE_CLIENT_ID = "878390311268-gr1hjedful6oi20tntbvp1euv3fuku2n.apps.googleusercontent.com";

interface Recipient {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  last_contacted_at: string | null;
}

const AVATAR_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(220 70% 55%)",
  "hsl(340 65% 50%)",
  "hsl(160 50% 40%)",
  "hsl(30 80% 50%)",
  "hsl(270 55% 50%)",
  "hsl(190 60% 45%)",
];

function getAvatarColor(name: string | null): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name: string | null): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

function daysAgoLabel(dateStr: string | null): string {
  if (!dateStr) return "Not yet encouraged";
  const days = Math.round(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days === 0) return "Encouraged today";
  if (days === 1) return "Encouraged yesterday";
  return `Encouraged ${days} days ago`;
}

interface PeopleScreenProps {
  onSelectContact: (prefill: PrefilledRecipient) => void;
}

export default function PeopleScreen({ onSelectContact }: PeopleScreenProps) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Recipient[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "" });
  const [addingContact, setAddingContact] = useState(false);
  const [contactPickerSupported] = useState(() =>
    typeof navigator !== "undefined" &&
    "contacts" in navigator &&
    "ContactsManager" in window
  );
  const [importingGoogle, setImportingGoogle] = useState(false);
  const [googleContacts, setGoogleContacts] = useState<Array<{ name: string; email: string; phone: string; selected: boolean }>>([]);
  const [showGooglePreview, setShowGooglePreview] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("recipients")
      .select("id, name, email, phone, last_contacted_at")
      .eq("user_id", user.id)
      .order("last_contacted_at", { ascending: false, nullsFirst: false });
    setContacts(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filtered = contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });

  const handleTap = (c: Recipient) => {
    const prefill: PrefilledRecipient = {};
    if (c.name) prefill.name = c.name;
    if (c.email) prefill.email = c.email;
    if (c.phone) prefill.phone = c.phone;
    onSelectContact(prefill);
  };

  const startEdit = (c: Recipient) => {
    setEditingId(c.id);
    setEditForm({
      name: c.name ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from("recipients")
      .update({
        name: editForm.name || null,
        email: editForm.email || null,
        phone: editForm.phone || null,
      })
      .eq("id", editingId);
    if (error) {
      toast.error("Failed to update contact");
    } else {
      toast.success("Contact updated");
      setEditingId(null);
      fetchContacts();
    }
  };

  const handleDelete = async (id: string, name: string | null) => {
    const { error } = await supabase.from("recipients").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete contact");
    } else {
      toast.success(`${name ?? "Contact"} removed`);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleAddContact = async () => {
    if (!user) return;
    const name = addForm.name.trim();
    const email = addForm.email.trim();
    const phone = addForm.phone.trim();
    if (!name) { toast.error("Name is required."); return; }
    if (!email && !phone) { toast.error("Please add an email or phone number."); return; }
    setAddingContact(true);
    let existingId: string | null = null;
    if (email) {
      const { data } = await supabase.from("recipients").select("id").eq("user_id", user.id).eq("email", email).maybeSingle();
      if (data) existingId = data.id;
    }
    if (!existingId && phone) {
      const { data } = await supabase.from("recipients").select("id").eq("user_id", user.id).eq("phone", phone).maybeSingle();
      if (data) existingId = data.id;
    }
    if (existingId) {
      await supabase.from("recipients").update({ name: name || null, email: email || null, phone: phone || null }).eq("id", existingId);
      toast.success("Contact updated.");
    } else {
      await supabase.from("recipients").insert({ user_id: user.id, name: name || null, email: email || null, phone: phone || null });
      toast.success(`${name} added.`);
    }
    setAddForm({ name: "", email: "", phone: "" });
    setShowAddForm(false);
    setAddingContact(false);
    fetchContacts();
  };

  const handlePhonePicker = async () => {
    try {
      const contacts = await (navigator as any).contacts.select(["name", "email", "tel"], { multiple: true });
      if (!contacts || contacts.length === 0) return;
      let added = 0;
      let updated = 0;
      for (const c of contacts) {
        const name = c.name?.[0]?.trim() || null;
        const email = c.email?.[0]?.trim() || null;
        const phone = c.tel?.[0]?.trim() || null;
        if (!email && !phone) continue;
        let existingId: string | null = null;
        if (email) {
          const { data } = await supabase.from("recipients").select("id").eq("user_id", user!.id).eq("email", email).maybeSingle();
          if (data) existingId = data.id;
        }
        if (!existingId && phone) {
          const { data } = await supabase.from("recipients").select("id").eq("user_id", user!.id).eq("phone", phone).maybeSingle();
          if (data) existingId = data.id;
        }
        if (existingId) {
          await supabase.from("recipients").update({ name: name || undefined, email: email || undefined, phone: phone || undefined }).eq("id", existingId);
          updated++;
        } else {
          await supabase.from("recipients").insert({ user_id: user!.id, name, email, phone });
          added++;
        }
      }
      toast.success(`${added} added, ${updated} updated.`);
      fetchContacts();
    } catch (err) {
      toast.error("Could not access contacts.");
    }
  };

  const handleGoogleImport = () => {
    if (!(window as any).google) {
      toast.error("Google sign-in not available. Please refresh and try again.");
      return;
    }
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/contacts.readonly",
      callback: async (response: any) => {
        if (response.error) {
          toast.error("Google sign-in failed.");
          return;
        }
        setImportingGoogle(true);
        try {
          const res = await fetch(
            "https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=500",
            { headers: { Authorization: `Bearer ${response.access_token}` } }
          );
          const data = await res.json();
          const connections = data.connections || [];
          const parsed = connections
            .map((p: any) => ({
              name: p.names?.[0]?.displayName?.trim() || "",
              email: p.emailAddresses?.[0]?.value?.trim() || "",
              phone: p.phoneNumbers?.[0]?.value?.trim() || "",
              selected: true,
            }))
            .filter((c: any) => c.name && (c.email || c.phone));
          if (parsed.length === 0) {
            toast.error("No contacts with email or phone found in your Google account.");
            setImportingGoogle(false);
            return;
          }
          setGoogleContacts(parsed);
          setShowGooglePreview(true);
        } catch (err) {
          toast.error("Failed to fetch Google contacts.");
        }
        setImportingGoogle(false);
      },
    });
    client.requestAccessToken();
  };

  const confirmGoogleImport = async () => {
    if (!user) return;
    const toImport = googleContacts.filter((c) => c.selected);
    if (toImport.length === 0) { toast.error("No contacts selected."); return; }
    setImportingGoogle(true);
    let added = 0;
    let updated = 0;
    for (const c of toImport) {
      let existingId: string | null = null;
      if (c.email) {
        const { data } = await supabase.from("recipients").select("id").eq("user_id", user.id).eq("email", c.email).maybeSingle();
        if (data) existingId = data.id;
      }
      if (!existingId && c.phone) {
        const { data } = await supabase.from("recipients").select("id").eq("user_id", user.id).eq("phone", c.phone).maybeSingle();
        if (data) existingId = data.id;
      }
      if (existingId) {
        await supabase.from("recipients").update({ name: c.name || null, email: c.email || null, phone: c.phone || null }).eq("id", existingId);
        updated++;
      } else {
        await supabase.from("recipients").insert({ user_id: user.id, name: c.name || null, email: c.email || null, phone: c.phone || null });
        added++;
      }
    }
    toast.success(`${added} added, ${updated} updated.`);
    setShowGooglePreview(false);
    setGoogleContacts([]);
    setImportingGoogle(false);
    fetchContacts();
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center pt-20">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-24">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-2xl font-bold text-primary">People</h1>
          <div className="flex gap-2">
              <button
                onClick={handleGoogleImport}
                disabled={importingGoogle}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {importingGoogle ? "Importing…" : "Google"}
              </button>
            {contactPickerSupported && (
              <button
                onClick={handlePhonePicker}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                Import
              </button>
            )}
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </header>

      {showAddForm && (
        <div className="mx-4 mt-2 mb-3 rounded-2xl bg-card p-4 shadow-card space-y-3 animate-fade-in">
          <p className="text-base font-semibold text-foreground">New contact</p>
          <Input
            placeholder="Name (required)"
            value={addForm.name}
            onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            placeholder="Email"
            type="email"
            value={addForm.email}
            onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            placeholder="Phone number"
            type="tel"
            value={addForm.phone}
            onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleAddContact}
              disabled={addingContact}
              className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {addingContact ? "Saving…" : "Save contact"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setShowAddForm(false); setAddForm({ name: "", email: "", phone: "" }); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 pt-32 text-center">
          <Heart className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            {search
              ? "No contacts match your search."
              : "The people you encourage will appear here."}
          </p>
        </div>
      ) : (
        <div className="px-4 space-y-2 mt-2">
          {filtered.map((c) => (
            <div key={c.id}>
              <div
                className="rounded-2xl bg-card p-4 shadow-card flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => editingId !== c.id && handleTap(c)}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white font-bold text-lg"
                  style={{ backgroundColor: getAvatarColor(c.name) }}
                >
                  {getInitial(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold leading-snug truncate">
                    {c.name || "Unnamed"}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {c.email || c.phone || "No contact info"}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {daysAgoLabel(c.last_contacted_at)}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="p-1.5 rounded-full hover:bg-muted transition-colors">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); startEdit(c); }}>
                      <Pencil className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.name); }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {editingId === c.id && (
                <div className="rounded-2xl bg-muted/50 p-4 mt-1 space-y-2 animate-fade-in">
                  <Input
                    placeholder="Name"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  />
                  <Input
                    placeholder="Phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={saveEdit}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
