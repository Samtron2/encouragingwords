import { useState } from "react";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminContentTab from "@/components/admin/AdminContentTab";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "users", label: "Users" },
  { key: "content", label: "Content" },
] as const;

type AdminTab = (typeof tabs)[number]["key"];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>("users");

  return (
    <div className="flex flex-1 flex-col px-6 pt-6 pb-24 animate-fade-in">
      <h1 className="font-display text-2xl font-semibold mb-4">Admin</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 rounded-lg bg-secondary/60 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-background text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "users" && <AdminUsersTab />}
      {activeTab === "content" && <AdminContentTab />}
    </div>
  );
}
