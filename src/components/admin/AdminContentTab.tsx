import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Upload, Pencil, CalendarDays, Link, FileJson, ImagePlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const OCCASION_OPTIONS = ["Birthday", "Anniversary", "Quinceañera", "Graduation", "Holiday", "Wedding", "New Baby", "Sympathy", "Get Well", "Retirement", "Just Because", "Encouragement", "Thank You", "Congratulations", "General", "Other"];
const MOOD_OPTIONS = ["Warm", "Playful", "Gentle", "Bold", "Heartfelt", "Funny", "Inspirational", "Calm", "Celebratory", "Sincere"];

const VISIBLE_COUNT = 6;

function TagSelector({ options, selected, onChange, label }: {
  options: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
  label: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState("");
  const [customInput, setCustomInput] = useState("");

  const otherSelected = selected.includes("Other");
  // Custom tags = selected tags not in the standard options list
  const customTags = selected.filter((t) => t !== "Other" && !options.includes(t));

  const toggle = (tag: string) => {
    onChange(
      selected.includes(tag)
        ? selected.filter((t) => t !== tag)
        : [...selected, tag]
    );
  };

  const addCustomTag = () => {
    const val = customInput.trim();
    if (val && !selected.includes(val)) {
      onChange([...selected, val]);
    }
    setCustomInput("");
  };

  const collapse = () => {
    setExpanded(false);
    setFilter("");
  };

  const filtered = filter
    ? options.filter((o) => o.toLowerCase().includes(filter.toLowerCase()))
    : options;

  const visibleOptions = expanded ? filtered : filtered.slice(0, VISIBLE_COUNT);
  const hiddenCount = filtered.length - VISIBLE_COUNT;

  // All removable chips: standard selected + custom tags
  const allChips = selected.filter((t) => options.includes(t) || !options.includes(t));

  return (
    <div>
      <p className="text-base font-medium text-muted-foreground mb-2">{label}</p>

      {/* Selected chips (always visible) */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs font-medium px-2.5 py-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => toggle(tag)}
                className="hover:opacity-70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Filter input */}
      {expanded && (
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter tags…"
          className="flex h-8 w-full rounded-full border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mb-2"
        />
      )}

      {/* Pill buttons */}
      <div className="flex flex-wrap gap-1.5">
        {visibleOptions.map((o) => (
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

        {!expanded && hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full px-3 py-1.5 text-[15px] font-medium border border-primary/30 text-primary/60 hover:text-primary hover:border-primary/50 transition-colors"
          >
            + {hiddenCount} more
          </button>
        )}
      </div>

      {expanded && (
        <button
          type="button"
          onClick={collapse}
          className="text-sm text-muted-foreground hover:text-foreground mt-1.5"
        >
          Show less
        </button>
      )}

      {/* Custom tag input when "Other" is selected */}
      {otherSelected && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
            placeholder="Add custom tag…"
            className="flex h-8 flex-1 rounded-full border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <button
            type="button"
            onClick={addCustomTag}
            disabled={!customInput.trim()}
            className="h-8 w-8 rounded-full border border-primary/30 text-primary hover:bg-primary/5 flex items-center justify-center disabled:opacity-40 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

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

  // Import state
  const [importPanel, setImportPanel] = useState<"urls" | "manifest" | "upload" | null>(null);
  const [urlText, setUrlText] = useState("");
  const [urlPrefix, setUrlPrefix] = useState("");
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [manifestItems, setManifestItems] = useState<{ name: string; url: string }[] | null>(null);
  const manifestRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

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

  const batchInsert = async (
    rows: { name: string; image_url: string }[],
    labelPrefix: string
  ) => {
    // Get existing URLs to skip duplicates
    const { data: existing } = await supabase
      .from("content_library")
      .select("image_url");
    const existingUrls = new Set((existing || []).map((e) => e.image_url));
    const unique = rows.filter((r) => !existingUrls.has(r.image_url));

    if (unique.length === 0) {
      toast({ title: "No new items to import — all URLs already exist" });
      setImportProgress(null);
      return;
    }

    let imported = 0;
    for (let i = 0; i < unique.length; i += 50) {
      const batch = unique.slice(i, i + 50).map((r) => ({
        name: r.name,
        image_url: r.image_url,
        active: true,
        featured: false,
        occasion_tags: [] as string[],
        mood_tags: [] as string[],
      }));
      setImportProgress(`${labelPrefix} ${Math.min(i + 50, unique.length)} of ${unique.length}`);
      const { error } = await supabase.from("content_library").insert(batch);
      if (error) {
        toast({ title: "Import error", description: error.message, variant: "destructive" });
        setImportProgress(null);
        return;
      }
      imported += batch.length;
    }

    toast({ title: `${imported} items imported ✨` });
    setImportProgress(null);
    setImportPanel(null);
    setUrlText("");
    setUrlPrefix("");
    setManifestItems(null);
    loadItems();
  };

  const handleUrlImport = () => {
    const lines = urlText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const rows = lines.map((url, i) => {
      const itemName = urlPrefix.trim()
        ? `${urlPrefix.trim()} ${i + 1}`
        : url.split("/").pop()?.split("?")[0] || `Item ${i + 1}`;
      return { name: itemName, image_url: url };
    });
    batchInsert(rows, "Importing...");
  };

  const handleManifestFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(data)) throw new Error("Expected array");
        setManifestItems(data as { name: string; url: string }[]);
      } catch {
        toast({ title: "Invalid JSON format", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleManifestImport = () => {
    if (!manifestItems) return;
    const rows = manifestItems.map((m) => ({ name: m.name, image_url: m.url }));
    batchInsert(rows, "Importing...");
  };

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = "";
    setImportPanel("upload");

    const rows: { name: string; image_url: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      setImportProgress(`Uploading ${i + 1} of ${files.length}…`);
      const file = files[i];
      const ext = file.name.split(".").pop();
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("content-images")
        .upload(path, file, { upsert: true });
      if (error) {
        toast({ title: `Failed: ${file.name}`, description: error.message, variant: "destructive" });
        continue;
      }
      const { data: urlData } = supabase.storage.from("content-images").getPublicUrl(path);
      rows.push({ name: baseName, image_url: urlData.publicUrl });
    }

    if (rows.length > 0) {
      // Insert all uploaded items
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50).map((r) => ({
          name: r.name,
          image_url: r.image_url,
          active: true,
          featured: false,
          occasion_tags: [] as string[],
          mood_tags: [] as string[],
        }));
        await supabase.from("content_library").insert(batch);
      }
      toast({ title: `${rows.length} images uploaded ✨` });
      loadItems();
    }

    setImportProgress(null);
    setImportPanel(null);
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
