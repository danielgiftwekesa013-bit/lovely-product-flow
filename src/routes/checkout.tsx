import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Smartphone, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getProduct, KSH, useAppState } from "@/lib/app-state";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
});

function Checkout() {
  const { state, placeOrder } = useAppState();
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const items = state.cart.map((c) => ({ ...c, product: getProduct(c.id)! })).filter((i) => i.product);
  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const delivery = 200;
  const total = subtotal + delivery;

  const pay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setDone(true);
      placeOrder();
      setTimeout(() => navigate({ to: "/orders" }), 1600);
    }, 2000);
  };

  return (
    <AppShell title="Checkout" back="/cart" showNav={false}>
      <div className="space-y-5 px-4 pt-4 pb-24">
        {/* Address */}
        <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold">Delivery Address</h3>
            </div>
            <button className="text-xs font-semibold text-primary">Change</button>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-sm">
            <p className="font-semibold">Home · {state.user.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Kilimani, Chaka Road, Apt 4B · Nairobi
            </p>
            <p className="text-xs text-muted-foreground">{state.user.phone}</p>
          </div>
        </section>

        {/* Payment */}
        <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold">Payment Method</h3>
          <label className="flex items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 p-3">
            <input type="radio" checked readOnly className="accent-[oklch(0.62_0.17_152)]" />
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">M-Pesa</p>
              <p className="text-xs text-muted-foreground">Pay via STK Push on {state.user.phone}</p>
            </div>
          </label>
        </section>

        {/* Summary */}
        <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold">Order summary</h3>
          <div className="space-y-2 text-sm">
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {i.product.name} × {i.qty}
                </span>
                <span className="font-medium">{KSH(i.product.price * i.qty)}</span>
              </div>
            ))}
            <div className="my-2 border-t border-dashed border-border" />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Delivery</span>
              <span className="font-medium">{KSH(delivery)}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold">Total amount</span>
              <span className="text-xl font-extrabold text-primary">{KSH(total)}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 border-t border-border/50 bg-card/95 p-4 backdrop-blur">
        <button
          disabled={items.length === 0 || processing}
          onClick={pay}
          className="h-14 w-full rounded-2xl bg-gradient-primary text-sm font-bold text-primary-foreground shadow-soft transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {processing ? "Processing..." : `Pay ${KSH(total)} with M-Pesa`}
        </button>
      </div>

      {(processing || done) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-6 backdrop-blur-sm">
          <div className="pop-in w-full max-w-xs rounded-3xl bg-card p-6 text-center shadow-elegant">
            {done ? (
              <>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft">
                  <Check className="h-8 w-8" strokeWidth={3} />
                </div>
                <h3 className="mt-4 text-lg font-bold">Payment successful!</h3>
                <p className="mt-1 text-xs text-muted-foreground">Redirecting to your orders...</p>
              </>
            ) : (
              <>
                <div className="mx-auto h-16 w-16">
                  <div className="h-full w-full animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                </div>
                <h3 className="mt-4 text-base font-bold">Awaiting M-Pesa...</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Check your phone for the STK Push prompt.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
