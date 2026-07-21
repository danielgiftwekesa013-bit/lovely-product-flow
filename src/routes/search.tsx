import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search as SearchIcon, X, Clock, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import { PRODUCTS } from "@/lib/app-state";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/search")({
  component: Search,
});

const recents = ["Wireless buds", "Smart watch", "Speaker"];
const suggestions = ["Noise cancelling", "Portable speaker", "Titanium watch", "M-Pesa deals"];

function Search() {
  const [q, setQ] = useState("");
  const results = PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.tagline.toLowerCase().includes(q.toLowerCase()) ||
      p.category.toLowerCase().includes(q.toLowerCase()),
  );
  const showResults = q.length > 0;

  return (
    <AppShell showNav>
      <div className="sticky top-0 z-10 border-b border-border/40 bg-card/95 px-4 py-3 backdrop-blur">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products..."
            className="h-12 w-full rounded-2xl border border-border bg-muted/40 pl-11 pr-11 text-sm outline-none focus:border-primary focus:bg-card"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {showResults ? (
        results.length === 0 ? (
          <EmptyState icon={SearchIcon} title="No results" description={`We couldn't find anything for "${q}".`} />
        ) : (
          <div className="grid grid-cols-2 gap-3.5 p-4">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-6 p-4">
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Recent
            </h3>
            <div className="flex flex-wrap gap-2">
              {recents.map((r) => (
                <button
                  key={r}
                  onClick={() => setQ(r)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium"
                >
                  {r}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Suggested
            </h3>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setQ(s)}
                  className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3 className="mb-3 text-sm font-bold">Featured</h3>
            <div className="grid grid-cols-2 gap-3.5">
              {PRODUCTS.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
