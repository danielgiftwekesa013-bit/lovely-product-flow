import { createFileRoute } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Package, Tag, Gift, Users, ShoppingBag, Bell } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/notifications")({
  component: Notifications,
});

type N = { icon: LucideIcon; title: string; body: string; time: string; tint: string };

const notifications: N[] = [
  { icon: Package, title: "Order shipped", body: "VRD-10312 is on its way. Track it now.", time: "2h", tint: "bg-blue-500/10 text-blue-600" },
  { icon: Tag, title: "Flash sale live!", body: "15% off Aura Wireless Buds — today only.", time: "5h", tint: "bg-amber-500/10 text-amber-600" },
  { icon: Gift, title: "You earned 84 points", body: "Redeem them anytime in Loyalty Rewards.", time: "1d", tint: "bg-primary/10 text-primary" },
  { icon: Users, title: "New referral joined", body: "Wanjiku K. signed up using your code.", time: "2d", tint: "bg-purple-500/10 text-purple-600" },
  { icon: ShoppingBag, title: "Back in stock", body: "Lumen Portable Speaker is available again.", time: "3d", tint: "bg-primary/10 text-primary" },
];

function Notifications() {
  return (
    <AppShell title="Notifications" back="/home">
      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="Notifications about orders, rewards and offers will show up here." />
      ) : (
        <div className="space-y-2 px-4 pt-4 pb-6">
          {notifications.map((n) => {
            const Icon = n.icon;
            return (
              <div
                key={n.title}
                className="flex gap-3 rounded-2xl border border-border/60 bg-card p-3.5 shadow-card"
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${n.tint}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{n.title}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{n.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
