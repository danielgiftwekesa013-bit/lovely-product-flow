import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Search, Sparkles, TrendingUp, Timer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import { PRODUCTS, useAppState } from "@/lib/app-state";

export const Route = createFileRoute("/home")({
  component: Home,
});

function Home() {
  const { state } = useAppState();
  return (
    <AppShell showNav>
      <div className="bg-gradient-hero px-5 pb-8 pt-12 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-white/80">Good morning</p>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Hi, {state.user.name.split(" ")[0]} 👋
            </h1>
          </div>
          <Link
            to="/notifications"
            className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white/20 backdrop-blur"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-white/30" />
          </Link>
        </div>
        <Link
          to="/search"
          className="mt-5 flex h-12 items-center gap-3 rounded-2xl bg-white/95 px-4 text-sm text-muted-foreground shadow-soft"
        >
          <Search className="h-4 w-4" />
          Search products...
        </Link>
      </div>

      <div className="-mt-6 space-y-8 px-5">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-primary-glow/20 p-5 shadow-card">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-soft">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Members save more
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold">
                Up to 20% off with Verde points
              </p>
            </div>
            <Link
              to="/rewards"
              className="rounded-full bg-foreground/90 px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
            >
              Redeem
            </Link>
          </div>
        </div>

        {/* Featured */}
        <section>
          <SectionHeader
            icon={<Sparkles className="h-4 w-4" />}
            title="Featured products"
          />
          <div className="mt-4 grid grid-cols-2 gap-3.5">
            {PRODUCTS.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* Popular */}
        <section>
          <SectionHeader
            icon={<TrendingUp className="h-4 w-4" />}
            title="Popular picks"
          />
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {PRODUCTS.map((p) => (
              <Link
                key={p.id}
                to="/product/$id"
                params={{ id: p.id }}
                className="w-44 shrink-0 rounded-2xl border border-border/60 bg-card p-3 shadow-card"
              >
                <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                  <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <p className="mt-2 truncate text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.category}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Limited */}
        <section className="pb-6">
          <SectionHeader icon={<Timer className="h-4 w-4" />} title="Limited offers" />
          <div className="mt-4 space-y-3">
            {PRODUCTS.slice(0, 2).map((p) => (
              <Link
                key={p.id}
                to="/product/$id"
                params={{ id: p.id }}
                className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-3 shadow-card"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                  <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{p.tagline}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      -15% today
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <h2 className="text-base font-bold">{title}</h2>
      </div>
      <button className="text-xs font-semibold text-primary">See all</button>
    </div>
  );
}
