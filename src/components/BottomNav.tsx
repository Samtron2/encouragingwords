import { Home, Send, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tab = "home" | "send" | "settings" | "admin";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  isAdmin?: boolean;
}

export default function BottomNav({ active, onChange, isAdmin }: BottomNavProps) {
  const items: { tab: Tab; icon: typeof Home; label: string }[] = [
    { tab: "home", icon: Home, label: "Home" },
    { tab: "send", icon: Send, label: "Send" },
    { tab: "settings", icon: Settings, label: "Settings" },
  ];

  if (isAdmin) {
    items.push({ tab: "admin", icon: Shield, label: "Admin" });
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-end justify-around px-4 pb-[env(safe-area-inset-bottom)] h-16">
        {items.map(({ tab, icon: Icon, label }) => {
          const isCenter = tab === "send";
          const isActive = active === tab;

          if (isCenter) {
            return (
              <button
                key={tab}
                onClick={() => onChange(tab)}
                className="hidden flex flex-col items-center gap-0.5 -mt-4 transition-all"
              >
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full shadow-elevated transition-all",
                    isActive
                      ? "bg-primary scale-105"
                      : "bg-primary/90 hover:bg-primary"
                  )}
                >
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className={cn(
                  "text-[11px] font-medium mt-0.5",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab}
              onClick={() => onChange(tab)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-3 transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium">{label}</span>
              {isActive && (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
