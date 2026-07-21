import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Trash2, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { getProduct, KSH, useAppState } from "@/lib/app-state";

export const Route = createFileRoute("/favorites")({
  component: Favorites,
});

function Favorites() {
  const { state, toggleFavorite, addToCart } = useAppState();
  const items = state.favorites.map((id) => getProduct(id)).filter(Boolean);

  return (
    <AppShell showNav>
      <header className="sticky top-0 z-10 border-b border-border/40 bg-card/95 px-4 py-3 backdrop-blur">
        <h1 className="text-base font-semibold">Wishlist</h1>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          description="Tap the heart on any product to save it here."
          action={
            <Link
              to="/home"
              className="inline-flex h-11 items-center rounded-2xl bg-gradient-primary px-6 text-sm font-semibold text-primary-foreground shadow-soft"
            >
              Explore products
            </Link>
          }
        />
      ) : (
        <div className="space-y-3 p-4">
          {items.map((p) => (
            <div key={p!.id} className="flex gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-card">
              <Link to="/product/$id" params={{ id: p!.id }} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                <img src={p!.image} alt="" className="h-full w-full object-cover" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div>
                  <p className="truncate text-sm font-semibold">{p!.name}</p>
                  <p className="text-xs text-muted-foreground">{p!.tagline}</p>
                  <p className="mt-1 text-sm font-bold text-primary">{KSH(p!.price)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addToCart(p!.id)}
                    className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-gradient-primary text-xs font-semibold text-primary-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add to Cart
                  </button>
                  <button
                    onClick={() => toggleFavorite(p!.id)}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
