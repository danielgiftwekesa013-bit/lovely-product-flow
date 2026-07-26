import { createFileRoute, Link } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/orders")({
  component: Orders,
});

const statusColor: Record<string, string> = {
  delivered: "bg-primary/10 text-primary",
  shipped: "bg-blue-500/10 text-blue-600",
  processing: "bg-amber-500/10 text-amber-600",
  paid: "bg-blue-500/10 text-blue-600",
  pending: "bg-amber-500/10 text-amber-600",
  completed: "bg-primary/10 text-primary",
  cancelled: "bg-destructive/10 text-destructive",
  failed: "bg-destructive/10 text-destructive",
};

type OrderItem = {
  id: string;
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  unit_price: number;
  quantity: number;
  total_amount: number;
  currency: string;
};

type Order = {
  id: string;
  order_number: string;
  total_amount: number;
  currency: string;
  order_status: string;
  created_at: string;
  items: OrderItem[];
};

function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchOrders() {
      try {
        setLoading(true);

        // ----------------------------------------------------
        // 1. GET THE CURRENTLY LOGGED-IN USER
        // ----------------------------------------------------
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          if (mounted) {
            setOrders([]);
          }
          return;
        }

        // ----------------------------------------------------
        // 2. CALCULATE THE RECENT 3-DAY DATE RANGE
        //
        // This page always shows orders from the most recent
        // three days.
        //
        // Example:
        // Today = July 26
        // Start date = July 23
        //
        // This includes orders created from July 23 onwards.
        // ----------------------------------------------------
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        // ----------------------------------------------------
        // 3. FETCH ORDERS BELONGING TO THE LOGGED-IN USER
        // ----------------------------------------------------
        const { data: orderData, error: ordersError } = await supabase
          .from("orders")
          .select(`
            id,
            order_number,
            total_amount,
            currency,
            order_status,
            created_at,
            order_items (
              id,
              product_id,
              product_name,
              product_image_url,
              unit_price,
              quantity,
              total_amount,
              currency
            )
          `)
          .eq("user_id", user.id)
          .gte("created_at", threeDaysAgo.toISOString())
          .order("created_at", { ascending: false });

        if (ordersError) {
          throw ordersError;
        }

        if (!mounted) return;

        // ----------------------------------------------------
        // 4. FORMAT DATABASE ORDERS FOR THE UI
        // ----------------------------------------------------
        const formattedOrders: Order[] = (orderData ?? []).map(
          (order) => ({
            id: order.id,
            order_number: order.order_number,
            total_amount: Number(order.total_amount ?? 0),
            currency: order.currency ?? "KES",
            order_status: order.order_status,
            created_at: order.created_at,
            items: (order.order_items ?? []).map((item) => ({
              id: item.id,
              product_id: item.product_id,
              product_name: item.product_name,
              product_image_url: item.product_image_url,
              unit_price: Number(item.unit_price ?? 0),
              quantity: item.quantity,
              total_amount: Number(item.total_amount ?? 0),
              currency: item.currency ?? "KES",
            })),
          })
        );

        setOrders(formattedOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);

        if (mounted) {
          setOrders([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchOrders();

    return () => {
      mounted = false;
    };
  }, []);

  // ----------------------------------------------------
  // FORMAT CURRENCY
  // ----------------------------------------------------
  function formatCurrency(
    amount: number,
    currency: string = "KES"
  ) {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  // ----------------------------------------------------
  // FORMAT ORDER DATE
  // ----------------------------------------------------
  function formatOrderDate(date: string) {
    return new Intl.DateTimeFormat("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  }

  // ----------------------------------------------------
  // LOADING STATE
  // ----------------------------------------------------
  if (loading) {
    return (
      <AppShell title="My Orders" back="/profile">
        <div className="px-4 pt-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <p className="text-center text-sm text-muted-foreground">
              Loading your orders...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="My Orders" back="/profile">
      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="Your purchase history from the recent 3 days will show up here."
        />
      ) : (
        <div className="space-y-3 px-4 pt-4">
          {orders.map((order) => {
            const first = order.items[0];

            const normalizedStatus =
              order.order_status.toLowerCase();

            const displayStatus =
              order.order_status.charAt(0).toUpperCase() +
              order.order_status.slice(1);

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-border/60 bg-card p-4 shadow-card"
              >
                <div className="flex gap-3">
                  {first?.product_image_url && (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                      <img
                        src={first.product_image_url}
                        alt={first.product_name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold">
                        {first?.product_name ?? "Order"}
                      </p>

                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          statusColor[normalizedStatus] ??
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        {displayStatus}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      #{order.order_number} ·{" "}
                      {formatOrderDate(order.created_at)}
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {formatCurrency(
                        order.total_amount,
                        order.currency
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Link
                    to="/product/$id"
                    params={{
                      id: first?.product_id ?? "aura-buds",
                    }}
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
