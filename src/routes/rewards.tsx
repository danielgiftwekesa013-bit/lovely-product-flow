import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Award } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/lib/app-state";

export const Route = createFileRoute("/rewards")({
  component: Rewards,
});

function Rewards() {
  const { state } = useAppState();
  const nextTier = 2000;
  const progress = Math.min(100, (state.points / nextTier) * 100);

  const recent = [
    { label: "Order VRD-10312", pts: 52, date: "18 Jul" },
    { label: "Order VRD-10284", pts: 84, date: "12 Jul" },
    { label: "Welcome bonus", pts: 500, date: "01 Jul" },
  ];

  return (
    <AppShell title="Loyalty Rewards" back="/profile">
      <div className="space-y-5 px-4 pt-4 pb-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-5 text-primary-foreground shadow-elegant">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs text-white/80">Your points</p>
              <p className="mt-1 text-4xl font-extrabold">{state.points.toLocaleString()}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
                <Award className="h-3 w-3" /> Silver Tier
              </div>
            </div>
            <Sparkles className="h-8 w-8 opacity-80" />
          </div>
          <div className="relative mt-5">
            <div className="flex justify-between text-[11px] text-white/85">
              <span>Silver</span>
              <span>Gold · {nextTier} pts</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-white/85">
              {nextTier - state.points} points to Gold Tier
            </p>
          </div>
        </div>

        <button className="h-13 w-full rounded-2xl bg-gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-soft">
          Redeem Rewards
        </button>

        <section>
          <h3 className="mb-3 text-sm font-bold">Recent activity</h3>
          <div className="space-y-2">
            {recent.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-3.5 shadow-card"
              >
                <div>
                  <p className="text-sm font-semibold">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.date}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                  +{r.pts}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
