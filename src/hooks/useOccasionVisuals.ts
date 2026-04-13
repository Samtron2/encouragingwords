import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Visual {
  id: string;
  name: string;
  image_url: string | null;
  occasion_tags: string[];
  mood_tags: string[];
}

export const SPECIAL_OCCASIONS = [
  "Birthday",
  "Anniversary",
  "Quinceañera",
  "Graduation",
  "Wedding",
  "New Baby",
  "Sympathy",
  "Get Well",
  "Retirement",
  "Mother's Day",
  "Father's Day",
  "Valentine's Day",
  "Thanksgiving",
  "Christmas",
  "Hanukkah",
  "Easter",
  "Just Because",
  "Congratulations",
  "Thank You",
  "Encouragement",
] as const;

export type SpecialOccasion = typeof SPECIAL_OCCASIONS[number];

export function useOccasionVisuals(occasion: SpecialOccasion | null) {
  const [visuals, setVisuals] = useState<Visual[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!occasion) {
      setVisuals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("content_library")
        .select("id, name, image_url, occasion_tags, mood_tags")
        .eq("active", true)
        .contains("occasion_tags", [occasion]);

      setVisuals((data as Visual[]) || []);
      setLoading(false);
    })();
  }, [occasion]);

  return { visuals, loading };
}
