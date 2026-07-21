import { createFileRoute } from "@tanstack/react-router";
import { Copy, Share2, Users, Gift, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/lib/app-state";

export const Route = createFileRoute("/referrals")({
  component: Referrals,
});

function Referrals() {
  const { state } = useAppState();
  const code = "VERDE-" + state.user.name.split(" ")[0].toUpperCase();
  return (
    <AppShell title="Referral Rewards" back="/profile">
      <div className="space-y-5 px-4 pt-4 pb-6">
        <div className="rounded-3xl bg-gradient-hero p-5 text-primary-foreground shadow-elegant">
          <p className="text-xs text-white/80">Your referral code</p>
          <p className="mt-1 text-3xl font-extrabold tracking-wider">{code}</p>
          <div className="mt-4 flex gap-2">
            <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/20 py-2.5 text-xs font-semibold backdrop-blur">
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
            <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-semibold text-primary">
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users} label="Successful referrals" value={state.referrals.toString()} />
          <StatCard icon={Gift} label="Referral points" value="750" />
        </div>

        <button className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-soft">
          <UserPlus className="h-4 w-4" /> Invite Friends
        </button>

        <section>
          <h3 className="mb-3 text-sm font-bold">How it works</h3>
          <div className="space-y-2">
            {[
              { t: "Share your code", d: "Send it to friends and family." },
              { t: "They shop", d: "Your friend places their first order using your code." },
              { t: "You both earn", d: "Get 250 points each after their delivery." },
            ].map((s, i) => (
              <div key={s.t} className="flex gap-3 rounded-2xl border border-border/60 bg-card p-3.5 shadow-card">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 font-bold text-primary">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold">{s.t}</p>
                  <p className="text-xs text-muted-foreground">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-bold">Referral history</h3>
          <div className="space-y-2">
            {[
              { name: "James M.", date: "12 Jul", status: "Rewarded", pts: 250 },
              { name: "Wanjiku K.", date: "05 Jul", status: "Rewarded", pts: 250 },
              { name: "David O.", date: "28 Jun", status: "Pending", pts: 0 },
            ].map((r) => (
              <div key={r.name} className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-3.5 shadow-card">
                <div>
                  <p className="text-sm font-semibold">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.date} · {r.status}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    r.pts > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {r.pts > 0 ? `+${r.pts}` : "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
