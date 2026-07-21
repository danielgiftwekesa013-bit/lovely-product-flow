import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { getProduct, KSH, useAppState } from "@/lib/app-state";

export const Route = createFileRoute("/cart")({
  component: Cart,
});

function Cart() {
  const { state, updateQty, removeFromCart } = useAppState();
  const items = state.cart
    .map((c) => ({ ...c, product: getProduct(c.id)! }))
    .filter((c) => c.product);

  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const delivery = items.length ? 200 : 0;
  const total = subtotal + delivery;

  return (
    <AppShell title="Your Cart" back="/home">
      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Add some products to get started with your order."
          action={
            <Link
              to="/home"
              className="inline-flex h-11 items-center rounded-2xl bg-gradient-primary px-6 text-sm font-semibold text-primary-foreground shadow-soft"
            >
              Browse products
            </Link>
          }
        />
      ) : (
        <div className="space-y-4 px-4 pt-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-card"
            >
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                <img src={item.product.image} alt={item.product.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.product.category}</p>
                    <p className="mt-1 text-sm font-bold text-primary">{KSH(item.product.price)}</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => updateQty(item.id, item.qty - 1)}
                    className="grid h-7 w-7 place-items-center rounded-full bg-muted"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center text-sm font-semibold">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.id, item.qty + 1)}
                    className="grid h-7 w-7 place-items-center rounded-full bg-gradient-primary text-primary-foreground"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <h3 className="text-sm font-semibold">Order summary</h3>
            <div className="mt-3 space-y-2 text-sm">
              <Row label="Subtotal" value={KSH(subtotal)} />
              <Row label="Delivery fee" value={KSH(delivery)} />
              <div className="my-2 border-t border-dashed border-border" />
              <Row label="Total" value={KSH(total)} bold />
            </div>
          </div>

          <Link
            to="/checkout"
            className="block h-13 rounded-2xl bg-gradient-primary py-3.5 text-center text-sm font-semibold text-primary-foreground shadow-soft"
          >
            Proceed to Checkout · {KSH(total)}
          </Link>
        </div>
      )}
    </AppShell>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "text-base font-extrabold text-primary" : "font-medium"}>{value}</span>
    </div>
  );
}
