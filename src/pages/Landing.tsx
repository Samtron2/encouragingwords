import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ContentItem {
  id: string;
  name: string;
  image_url: string | null;
}

function useRotatingVisual() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("content_library")
        .select("id, name, image_url")
        .eq("active", true)
        .limit(20);
      if (data && data.length > 0) setItems(data);
    })();
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setFade(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, [items.length]);

  return { item: items[index] ?? null, fade };
}

function VisualDisplay({ item, fade }: { item: ContentItem | null; fade: boolean }) {
  if (!item) return null;

  const isEmoji = !item.image_url;

  return (
    <div
      className="transition-opacity duration-500 ease-in-out"
      style={{ opacity: fade ? 1 : 0 }}
    >
      {isEmoji ? (
        <div className="w-[200px] h-[200px] md:w-[240px] md:h-[240px] rounded-2xl flex items-center justify-center visual-tile-emoji mx-auto">
          <span className="text-[100px] leading-none">{item.name}</span>
        </div>
      ) : (
        <img
          src={item.image_url!}
          alt={item.name}
          className="w-[200px] h-[200px] md:w-[240px] md:h-[240px] rounded-2xl object-cover mx-auto"
        />
      )}
    </div>
  );
}

const Landing = () => {
  const { user, loading } = useAuth();
  const { item, fade } = useRotatingVisual();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Cream background */}
      <div className="absolute inset-0 bg-[#FAF7F2]" />

      {/* Teal diagonal */}
      <div
        className="absolute inset-0 hidden md:block"
        style={{
          backgroundColor: "#2D6E6E",
          clipPath: "polygon(100% 30%, 100% 100%, 0 100%, 0 65%)",
        }}
      />
      <div
        className="absolute inset-0 md:hidden"
        style={{
          backgroundColor: "#2D6E6E",
          clipPath: "polygon(100% 45%, 100% 100%, 0 100%, 0 55%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Upper section — cream area */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-12 md:pb-0 md:items-start md:pl-[10%]" style={{ minHeight: "50vh" }}>
          <div className="max-w-lg text-center md:text-left">
            <div className="text-6xl mb-6">👍</div>
            <h1
              className="font-display text-[36px] md:text-[48px] font-bold leading-[1.15] tracking-tight"
              style={{ color: "#1C1C1C" }}
            >
              Because some things deserve more than a text.
            </h1>
            <div className="mt-8">
              <Link
                to="/auth"
                className="inline-block rounded-full px-8 py-4 text-lg font-bold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: "#C97B84" }}
              >
                Get started free
              </Link>
            </div>
          </div>
        </div>

        {/* Lower section — teal area */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 pt-8 pb-12 md:flex-row md:items-center md:justify-around md:pt-0" style={{ minHeight: "45vh" }}>
          <div className="max-w-md text-center space-y-3 mb-8 md:mb-0">
            <p className="font-display text-[20px] md:text-[24px] text-white italic leading-relaxed">
              Texting is reactive. This is intentional.
            </p>
            <p className="font-display text-[20px] md:text-[24px] text-white italic leading-relaxed">
              They don't need the app. You just send it.
            </p>
            <p className="font-display text-[20px] md:text-[24px] text-white italic leading-relaxed">
              Thirty seconds. Lasts all day.
            </p>
          </div>

          <VisualDisplay item={item} fade={fade} />
        </div>
      </div>
    </div>
  );
};

export default Landing;
