import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X, Upload, Pencil, CalendarDays } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const OCCASION_OPTIONS = ["Birthday", "Anniversary", "Quinceañera", "Graduation", "Holiday", "General", "Other"];
const MOOD_OPTIONS = ["Warm", "Playful", "Gentle", "Bold"];

interface ContentItem {
  id: string;
  name: string;
  image_url: string | null;
  occasion_tags: string[];
  mood_tags: string[];
  active: boolean;
  featured: boolean;
  featured_date: string | null;
}

function TagSelector({ options, selected, onChange, label }: {
  options: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
  label: string;
}) {
  const toggle = (tag: string) => {
    onChange(
      selected.includes(tag)
        ? selected.filter((t) => t !== tag)
        : [...selected, tag]
    );
  };

  return (
    <div>
      <p className="text-base font-medium text-muted-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className={`rounded-full px-3 py-1.5 text-[15px] font-medium border transition-colors ${
              selected.includes(o)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-primary border-primary/30 hover:bg-primary/5"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AdminContentTab() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);

  const [name, setName] = useState("");
  const [occasionTags, setOccasionTags] = useState<string[]>([]);
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [featuredDate, setFeaturedDate] = useState<Date | undefined>(undefined);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("content_library")
      .select("id, name, image_url, occasion_tags, mood_tags, active, featured, featured_date")
      .order("created_at", { ascending: false });
    setItems((data as ContentItem[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const resetForm = () => {
    setName("");
    setOccasionTags([]);
    setMoodTags([]);
    setActive(true);
    setFeatured(false);
    setFeaturedDate(undefined);
    setImageFile(null);
    setImagePreview(null);
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (item: ContentItem) => {
    setEditing(item);
    setName(item.name);
    setOccasionTags(item.occasion_tags);
    setMoodTags(item.mood_tags);
    setActive(item.active);
    setFeatured(item.featured);
    setFeaturedDate(item.featured_date ? new Date(item.featured_date + "T00:00:00") : undefined);
    setImagePreview(item.image_url);
    setImageFile(null);
    setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    let imageUrl = editing?.image_url || null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("content-images")
        .upload(path, imageFile, { upsert: true });

      if (upErr) {
        toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("content-images")
        .getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      image_url: imageUrl,
      occasion_tags: occasionTags,
      mood_tags: moodTags,
      active,
      featured,
      featured_date: featuredDate ? format(featuredDate, "yyyy-MM-dd") : null,
    };

    if (editing) {
      const { error } = await supabase
        .from("content_library")
        .update(payload)
        .eq("id", editing.id);
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      toast({ title: "Content updated ✨" });
    } else {
      const { error } = await supabase
        .from("content_library")
        .insert([payload as { name: string }]);
      if (error) {
        toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      toast({ title: "Content added ✨" });
    }

    setSaving(false);
    resetForm();
    loadItems();
  };

  const toggleActive = async (item: ContentItem) => {
    await supabase
      .from("content_library")
      .update({ active: !item.active })
      .eq("id", item.id);
    loadItems();
  };

  if (showForm) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-primary">
            {editing ? "Edit content" : "Add content"}
          </h3>
          <button onClick={resetForm} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl bg-card p-6 space-y-4 shadow-card">
          <div>
            <label className="text-base font-medium text-muted-foreground mb-1.5 block">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Content name" className="text-base" />
          </div>

          <TagSelector options={OCCASION_OPTIONS} selected={occasionTags} onChange={setOccasionTags} label="Occasion tags" />
          <TagSelector options={MOOD_OPTIONS} selected={moodTags} onChange={setMoodTags} label="Mood tags" />

          <div>
            <p className="text-base font-medium text-muted-foreground mb-2">Image</p>
            {imagePreview ? (
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-border">
                <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-foreground/60 text-background flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex h-32 w-32 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors"
              >
                <Upload className="h-5 w-5" />
                <span className="text-sm">Upload</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>

          {/* Featured date picker */}
          <div>
            <p className="text-base font-medium text-muted-foreground mb-2">Feature on date (optional)</p>
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal text-base gap-2"
                  >
                    <CalendarDays className="h-4 w-4" />
                    {featuredDate ? format(featuredDate, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={featuredDate}
                    onSelect={setFeaturedDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {featuredDate && (
                <button
                  onClick={() => setFeaturedDate(undefined)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-base font-medium">Active</span>
            <Switch checked={active} onCheckedChange={setActive} className="data-[state=checked]:bg-accent" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base font-medium">Featured</span>
            <Switch checked={featured} onCheckedChange={setFeatured} className="data-[state=checked]:bg-accent" />
          </div>

          <Button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="w-full rounded-full bg-accent text-accent-foreground font-bold text-base py-5 shadow-glow hover:bg-accent/90"
          >
            {saving ? "Saving…" : editing ? "Update" : "Add content"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <Button
          size="sm"
          className="gap-1.5 rounded-full bg-accent text-accent-foreground font-bold hover:bg-accent/90"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add content
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-base text-muted-foreground text-center py-10">No content yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl bg-card shadow-card overflow-hidden transition-opacity ${
                !item.active ? "opacity-50" : ""
              }`}
            >
              <div className="relative h-24 bg-secondary flex items-center justify-center">
                {item.image_url?.startsWith("emoji:") ? (
                  <span className="text-5xl">{item.image_url.replace("emoji:", "")}</span>
                ) : item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full" style={{ backgroundColor: "hsl(30, 60%, 85%)" }} />
                )}
                {item.featured_date && (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-full bg-card/90 backdrop-blur-sm px-2 py-0.5 shadow-sm" title={item.featured_date}>
                    <CalendarDays className="h-3 w-3 text-accent" />
                    <span className="text-[11px] font-medium text-accent">
                      {format(new Date(item.featured_date + "T00:00:00"), "MMM d")}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                <p className="text-base font-medium truncate">{item.name}</p>
                <div className="flex flex-wrap gap-1">
                  {item.occasion_tags.slice(0, 2).map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs px-2 py-0.5">
                      {t}
                    </Badge>
                  ))}
                  {item.occasion_tags.length > 2 && (
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      +{item.occasion_tags.length - 2}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => openEdit(item)}
                    className="text-sm text-accent hover:underline flex items-center gap-0.5"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(item)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto"
                  >
                    {item.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
