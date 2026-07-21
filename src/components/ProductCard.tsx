import { Link } from "@tanstack/react-router";
import { Heart, Plus } from "lucide-react";
import { KSH, useAppState, type Product } from "@/lib/app-state";

export function ProductCard({ product }: { product: Product }) {
  const { state, toggleFavorite, addToCart } = useAppState();
  const fav = state.favorites.includes(product.id);
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card transition-all hover:shadow-elegant">
      <Link to="/product/$id" params={{ id: product.id }} className="block">
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted to-accent/50">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite(product.id);
            }}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-card/90 backdrop-blur transition-transform active:scale-90"
            aria-label="Toggle favorite"
          >
            <Heart
              className={`h-4 w-4 ${fav ? "fill-destructive text-destructive" : "text-foreground"}`}
            />
          </button>
        </div>
      </Link>
      <div className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
          {product.category}
        </p>
        <Link to="/product/$id" params={{ id: product.id }} className="mt-0.5 block">
          <h3 className="truncate text-sm font-semibold">{product.name}</h3>
        </Link>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{product.tagline}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-base font-bold">{KSH(product.price)}</span>
          <button
            type="button"
            onClick={() => addToCart(product.id, 1)}
            className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft transition-transform active:scale-90"
            aria-label="Add to cart"
          >
            <Plus className="h-4 w-4" strokeWidth={2.6} />
          </button>
        </div>
      </div>
    </div>
  );
}
