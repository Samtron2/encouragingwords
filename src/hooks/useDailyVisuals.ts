import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Visual {
  id: string;
  name: string;
  image_url: string | null;
  occasion_tags: string[];
  mood_tags: string[];
}

// Deterministic daily shuffle using date as seed
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function todaySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MAX_DAILY = 15;

export function useDailyVisuals() {
  const [visuals, setVisuals] = useState<Visual[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = todayDateString();

      // Fetch featured items for today
      const { data: featuredData } = await supabase
        .from("content_library")
        .select("id, name, image_url, occasion_tags, mood_tags")
        .eq("active", true)
        .eq("featured_date", today);

      const featured = (featuredData as Visual[]) || [];

      const remaining = MAX_DAILY - featured.length;
      let fillers: Visual[] = [];

      if (remaining > 0) {
        // Fetch all active items without a featured_date
        const { data: poolData } = await supabase
          .from("content_library")
          .select("id, name, image_url, occasion_tags, mood_tags")
          .eq("active", true)
          .is("featured_date", null);

        const pool = (poolData as Visual[]) || [];
        const shuffled = seededShuffle(pool, todaySeed());
        fillers = shuffled.slice(0, remaining);
      }

      setVisuals([...featured, ...fillers]);
      setLoading(false);
    })();
  }, []);

  return { visuals, loading };
}
