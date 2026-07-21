import { createFileRoute, Link } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { getProduct, KSH, useAppState } from "@/lib/app-state";

export const Route = createFileRoute("/orders")({
  component: Orders,
});

const statusColor: Record<string, string> = {
  Delivered: "bg-primary/10 text-primary",
  Shipped: "bg-blue-500/10 text-blue-600",
  Processing: "bg-amber-500/10 text-amber-600",
};

function Orders() {
  const { state } = useAppState();
  return (
    <AppShell title="My Orders" back="/profile">
      {state.orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders yet" description="Your purchase history will show up here." />
      ) : (
        <div className="space-y-3 px-4 pt-4">
          {state.orders.map((order) => {
            const first = getProduct(order.items[0]?.id);
            return (
              <div
                key={order.id}
                className="rounded-2xl border border-border/60 bg-card p-4 shadow-card"
              >
                <div className="flex gap-3">
                  {first && (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                      <img src={first.image} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{first?.name ?? "Order"}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor[order.status]}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      #{order.id} · {order.date}
                    </p>
                    <p className="mt-1 text-sm font-bold">{KSH(order.total)}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="h-9 flex-1 rounded-xl border border-border text-xs font-semibold">
                    Track Order
                  </button>
                  <Link
                    to="/product/$id"
                    params={{ id: order.items[0]?.id ?? "aura-buds" }}
                    className="grid h-9 flex-1 place-items-center rounded-xl bg-gradient-primary text-xs font-semibold text-primary-foreground"
                  >
                    Buy again
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
