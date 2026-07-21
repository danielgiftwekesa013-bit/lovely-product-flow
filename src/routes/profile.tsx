import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  User,
  MapPin,
  Package,
  Bell,
  Shield,
  Lock,
  HelpCircle,
  LogOut,
  ChevronRight,
  Gift,
  Users,
  Pencil,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/lib/app-state";

export const Route = createFileRoute("/profile")({
  component: Profile,
});

function Profile() {
  const { state, logout } = useAppState();
  const navigate = useNavigate();
  const items: { icon: LucideIcon; label: string; to?: string }[] = [
    { icon: User, label: "Edit Profile" },
    { icon: MapPin, label: "Delivery Addresses" },
    { icon: Package, label: "Order History", to: "/orders" },
    { icon: Gift, label: "Loyalty Rewards", to: "/rewards" },
    { icon: Users, label: "Referral Rewards", to: "/referrals" },
    { icon: Bell, label: "Notifications", to: "/notifications" },
    { icon: Shield, label: "Security" },
    { icon: Lock, label: "Privacy" },
    { icon: HelpCircle, label: "Help Center" },
  ];

  return (
    <AppShell showNav>
      <div className="bg-gradient-hero px-5 pb-16 pt-12 text-primary-foreground">
        <h1 className="text-xl font-bold">My Profile</h1>
      </div>
      <div className="-mt-12 px-4">
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-2xl font-bold text-primary-foreground shadow-soft">
                {state.user.name.charAt(0)}
              </div>
              <button className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-card shadow-soft ring-2 ring-card">
                <Pencil className="h-3 w-3" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold">{state.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{state.user.email}</p>
              <p className="text-xs text-muted-foreground">{state.user.phone}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Orders" value={state.orders.length.toString()} />
            <Stat label="Points" value={state.points.toLocaleString()} />
            <Stat label="Referrals" value={state.referrals.toString()} />
          </div>
        </div>

        <div className="mt-5 space-y-1.5 rounded-3xl border border-border/60 bg-card p-2 shadow-card">
          {items.map((it) => {
            const Icon = it.icon;
            const content = (
              <div className="flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-muted/60">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm font-medium">{it.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            );
            return it.to ? (
              <Link key={it.label} to={it.to}>
                {content}
              </Link>
            ) : (
              <button key={it.label} className="block w-full text-left">
                {content}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            logout();
            navigate({ to: "/login" });
          }}
          className="mt-4 mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm font-semibold text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-3 text-center">
      <p className="text-base font-extrabold text-primary">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
