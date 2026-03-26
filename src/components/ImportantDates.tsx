import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const OCCASIONS = [
  "Birthday",
  "Anniversary",
  "Quinceañera",
  "Graduation",
  "Holiday",
  "Other",
];

interface ImportantDate {
  id: string;
  name: string;
  month: number;
  day: number;
  occasion_type: string;
  contact_id: string | null;
}

interface Contact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

export default function ImportantDates() {
  const { user } = useAuth();
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [occasion, setOccasion] = useState("Birthday");
  const [contactSuggestions, setContactSuggestions] = useState<Contact[]>([]);
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);
  const [linkedContactId, setLinkedContactId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadDates = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("important_dates")
      .select("id, name, month, day, occasion_type, contact_id")
      .eq("user_id", user.id)
      .order("month", { ascending: true })
      .order("day", { ascending: true });
    setDates((data as ImportantDate[]) || []);
  };

  useEffect(() => {
    loadDates();
  }, [user]);

  useEffect(() => {
    if (!user || name.length < 2) {
      setContactSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("recipients")
        .select("id, name, email, phone")
        .eq("user_id", user.id)
        .ilike("name", `%${name}%`)
        .limit(5);
      setContactSuggestions((data as Contact[]) || []);
    }, 250);
    return () => clearTimeout(timeout);
  }, [name, user]);

  const handleAdd = async () => {
    if (!user || !name.trim() || !selectedDate) return;
    setSaving(true);

    const { error } = await supabase.from("important_dates").insert([{
      user_id: user.id,
      contact_id: linkedContactId,
      name: name.trim(),
      month: selectedDate.getMonth() + 1,
      day: selectedDate.getDate(),
      occasion_type: occasion,
    }]);

    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Date added ✨" });
    setName("");
    setSelectedDate(undefined);
    setOccasion("Birthday");
    setLinkedContactId(null);
    setShowForm(false);
    loadDates();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("important_dates").delete().eq("id", id);
    setDates((prev) => prev.filter((d) => d.id !== id));
  };

  const monthDay = (month: number, day: number) => {
    const d = new Date(2000, month - 1, day);
    return format(d, "MMM d");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-base font-medium">Important Dates</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-accent"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? "Cancel" : "Add"}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-background p-4 space-y-3 animate-fade-in">
          <div className="relative">
            <Input
              placeholder="Who is this date for?"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setLinkedContactId(null);
                setShowContactSuggestions(true);
              }}
              onFocus={() => setShowContactSuggestions(true)}
              onBlur={() => setTimeout(() => setShowContactSuggestions(false), 200)}
              className="text-base"
            />
            {showContactSuggestions && contactSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                {contactSuggestions.map((c) => (
                  <button
                    key={c.id}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-base hover:bg-secondary/60 transition-colors"
                    onMouseDown={() => {
                      setName(c.name || "");
                      setLinkedContactId(c.id);
                      setShowContactSuggestions(false);
                    }}
                  >
                    <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-muted-foreground">
                      {(c.name || "?")[0].toUpperCase()}
                    </div>
                    <span>{c.name}</span>
                    {c.email && (
                      <span className="text-sm text-muted-foreground ml-auto truncate">
                        {c.email}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal text-base",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "MMMM d") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Select value={occasion} onValueChange={setOccasion}>
            <SelectTrigger className="text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OCCASIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleAdd}
            disabled={!name.trim() || !selectedDate || saving}
            className="w-full rounded-full bg-accent text-accent-foreground font-bold text-base py-5 shadow-glow hover:bg-accent/90"
          >
            {saving ? "Saving…" : "Save date"}
          </Button>
        </div>
      )}

      {dates.length > 0 && (
        <div className="space-y-1">
          {dates.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-2xl px-3 py-2.5 hover:bg-secondary/40 transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-base font-medium truncate">{d.name}</p>
                <p className="text-sm text-muted-foreground">
                  {monthDay(d.month, d.day)} · {d.occasion_type}
                </p>
              </div>
              <button
                onClick={() => handleDelete(d.id)}
                className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 shrink-0 p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {dates.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">
          No dates saved yet. Tap Add to remember someone special.
        </p>
      )}
    </div>
  );
}
