import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Heart, Search, MoreVertical, Pencil, Trash2, UserPlus, Upload } from "lucide-react";
import { toast } from "sonner";
import type { Tab } from "@/components/BottomNav";
import type { PrefilledRecipient } from "@/components/MessageComposer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
