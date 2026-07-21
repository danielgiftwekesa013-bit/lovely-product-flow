import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Minus, Plus, ShieldCheck, Truck, Share2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getProduct, KSH, useAppState } from "@/lib/app-state";

export const Route = createFileRoute("/product/$id")({
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const product = getProduct(id);
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);
  const navigate = useNavigate();
  const { state, addToCart, toggleFavorite } = useAppState();

  if (!product) {
    return (
      <AppShell title="Not found" back="/home">
        <p className="p-6 text-sm text-muted-foreground">Product not found.</p>
      </AppShell>
    );
  }

  const fav = state.favorites.includes(product.id);

  return (
    <AppShell showNav={false} bare>
      <div className="flex min-h-screen flex-col md:min-h-[820px]">
        <div className="relative bg-gradient-to-br from-muted to-accent/60 pb-6 pt-14">
          <div className="absolute left-4 top-4 z-10">
            <Link to="/home" className="grid h-10 w-10 place-items-center rounded-full bg-card/90 backdrop-blur shadow-soft">
              ←
            </Link>
          </div>
          <div className="absolute right-4 top-4 z-10 flex gap-2">
            <button className="grid h-10 w-10 place-items-center rounded-full bg-card/90 backdrop-blur shadow-soft">
              <Share2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => toggleFavorite(product.id)}
              className="grid h-10 w-10 place-items-center rounded-full bg-card/90 backdrop-blur shadow-soft"
            >
              <Heart className={`h-4 w-4 ${fav ? "fill-destructive text-destructive" : ""}`} />
            </button>
          </div>

          <div className="mx-auto flex aspect-square w-72 items-center justify-center">
            <img
              src={product.gallery[img]}
              alt={product.name}
              className="h-full w-full rounded-3xl object-cover shadow-elegant pop-in"
              key={img}
            />
          </div>
          <div className="mt-4 flex justify-center gap-2">
            {product.gallery.map((g, i) => (
              <button
                key={g}
                onClick={() => setImg(i)}
                className={`h-14 w-14 overflow-hidden rounded-xl border-2 transition-all ${
                  i === img ? "border-primary shadow-soft" : "border-transparent opacity-70"
                }`}
              >
                <img src={g} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-6 rounded-t-3xl bg-card px-5 py-6 -mt-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {product.category}
            </p>
            <div className="mt-1 flex items-start justify-between gap-4">
              <h1 className="text-2xl font-extrabold">{product.name}</h1>
              <span className="whitespace-nowrap text-xl font-extrabold text-primary">
                {KSH(product.price)}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{product.tagline}</p>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-muted/60 p-3">
            <span className="text-sm font-semibold">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="grid h-8 w-8 place-items-center rounded-full bg-card shadow-soft"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">About this product</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Specifications</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {product.specs.map((s) => (
                <div key={s.label} className="rounded-2xl border border-border/60 bg-muted/30 p-3">
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  <p className="mt-0.5 text-sm font-semibold">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-2xl bg-primary/5 p-3">
              <Truck className="h-5 w-5 text-primary" />
              <div className="text-xs">
                <p className="font-semibold">Free delivery in Nairobi</p>
                <p className="text-muted-foreground">Estimated arrival in 1-2 days</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-primary/5 p-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div className="text-xs">
                <p className="font-semibold">2-year Verde warranty</p>
                <p className="text-muted-foreground">Hassle-free replacement</p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-border/50 bg-card/95 p-4 backdrop-blur">
          <button
            onClick={() => addToCart(product.id, qty)}
            className="h-13 flex-1 rounded-2xl border-2 border-primary py-3.5 text-sm font-semibold text-primary"
          >
            Add to Cart
          </button>
          <button
            onClick={() => {
              addToCart(product.id, qty);
              navigate({ to: "/checkout" });
            }}
            className="h-13 flex-1 rounded-2xl bg-gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-soft"
          >
            Buy Now
          </button>
        </div>
      </div>
    </AppShell>
  );
}
