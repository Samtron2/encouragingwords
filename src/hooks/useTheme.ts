import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Theme = "light" | "dark";

const STORAGE_KEY = "ew-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("theme-light", "theme-dark");
  root.classList.add(`theme-${theme}`);
}

export function useTheme() {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored === "dark" ? "dark" : "light";
  });

  // Apply on mount & change
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Load from profile on auth
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("theme")
        .eq("user_id", user.id)
        .single();
      if (data?.theme && (data.theme === "light" || data.theme === "dark" || data.theme === "royal")) {
        setThemeState(data.theme as Theme);
        localStorage.setItem(STORAGE_KEY, data.theme);
      }
    })();
  }, [user]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);

    if (user) {
      await supabase
        .from("profiles")
        .update({ theme: newTheme } as any)
        .eq("user_id", user.id);
    }
  };

  return { theme, setTheme };
}
