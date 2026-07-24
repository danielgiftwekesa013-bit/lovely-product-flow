import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/cart")({
  component: Cart,
});

type CartItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  unit_price: number;
  quantity: number;
  total_amount: number;
  currency: string;
};

function Cart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  async function loadCart() {
    try {
      setLoading(true);
      setError(null);

      // Get authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error("You must be logged in to view your cart.");
      }

      // Find the customer's current pending order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", user.id)
        .eq("order_status", "pending")
        .eq("payment_status", "pending")
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (orderError) {
        throw orderError;
      }

      // Customer has no active pending order/cart
      if (!order) {
        setItems([]);
        return;
      }

      // Fetch items belonging to the customer's pending order
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select(
          `
            id,
            order_id,
            product_id,
            product_name,
            product_image_url,
            unit_price,
            quantity,
            total_amount,
            currency
          `,
        )
        .eq("order_id", order.id)
        .order("created_at", {
          ascending: true,
        });

      if (itemsError) {
        throw itemsError;
      }

      const formattedItems: CartItem[] = (orderItems ?? []).map(
        (item) => ({
          id: item.id,
          order_id: item.order_id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_image_url: item.product_image_url,
          unit_price: Number(item.unit_price),
          quantity: item.quantity,
          total_amount: Number(item.total_amount),
          currency: item.currency,
        }),
      );

      setItems(formattedItems);
    } catch (err) {
      console.error("Failed to load cart:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading your cart.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateQuantity(
    item: CartItem,
    newQuantity: number,
  ) {
    if (newQuantity < 1) {
      await removeItem(item.id);
      return;
    }

    try {
      setUpdatingItem(item.id);

      const newTotalAmount =
        item.unit_price * newQuantity;

      const { error: updateError } = await supabase
        .from("order_items")
        .update({
          quantity: newQuantity,
          total_amount: newTotalAmount,
        })
        .eq("id", item.id);

      if (updateError) {
        throw updateError;
      }

      // Update local UI immediately
      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                quantity: newQuantity,
                total_amount: newTotalAmount,
              }
            : currentItem,
        ),
      );

      // Update order totals
      await updateOrderTotal(item.order_id);
    } catch (err) {
      console.error("Failed to update quantity:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update product quantity.",
      );
    } finally {
      setUpdatingItem(null);
    }
  }

  async function removeItem(itemId: string) {
    try {
      setUpdatingItem(itemId);

      const itemToRemove = items.find(
        (item) => item.id === itemId,
      );

      if (!itemToRemove) {
        return;
      }

      const { error: deleteError } = await supabase
        .from("order_items")
        .delete()
        .eq("id", itemId);

      if (deleteError) {
        throw deleteError;
      }

      // Remove from local UI
      setItems((currentItems) =>
        currentItems.filter(
          (item) => item.id !== itemId,
        ),
      );

      // Update order total
      await updateOrderTotal(itemToRemove.order_id);
    } catch (err) {
      console.error("Failed to remove item:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove product from cart.",
      );
    } finally {
      setUpdatingItem(null);
    }
  }

  async function updateOrderTotal(orderId: string) {
    // Get latest items for this order
    const { data: latestItems, error } = await supabase
      .from("order_items")
      .select("total_amount")
      .eq("order_id", orderId);

    if (error) {
      console.error(
        "Failed to calculate order total:",
        error,
      );
      return;
    }

    const subtotal = (latestItems ?? []).reduce(
      (sum, item) =>
        sum + Number(item.total_amount),
      0,
    );

    // No delivery fee
    const totalAmount = subtotal;

    const { error: orderUpdateError } =
      await supabase
        .from("orders")
        .update({
          subtotal,
          total_amount: totalAmount,
        })
        .eq("id", orderId);

    if (orderUpdateError) {
      console.error(
        "Failed to update order total:",
        orderUpdateError,
      );
    }
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.total_amount,
    0,
  );

  // Delivery fee removed
  const total = subtotal;

  if (loading) {
    return (
      <AppShell title="Your Cart" back="/home">
        <div className="space-y-4 px-4 pt-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Your Cart" back="/home">
      {error && (
        <div className="mx-4 mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">
            Something went wrong
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {error}
          </p>
        </div>
      )}

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
                <img
                  src={
                    item.product_image_url ??
                    "/placeholder-product.png"
                  }
                  alt={item.product_name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {item.product_name}
                    </p>

                    <p className="mt-1 text-sm font-bold text-primary">
                      {formatCurrency(
                        item.unit_price,
                        item.currency,
                      )}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      removeItem(item.id)
                    }
                    disabled={
                      updatingItem === item.id
                    }
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() =>
                      updateQuantity(
                        item,
                        item.quantity - 1,
                      )
                    }
                    disabled={
                      updatingItem === item.id
                    }
                    className="grid h-7 w-7 place-items-center rounded-full bg-muted disabled:opacity-50"
                  >
                    <Minus className="h-3 w-3" />
                  </button>

                  <span className="w-5 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() =>
                      updateQuantity(
                        item,
                        item.quantity + 1,
                      )
                    }
                    disabled={
                      updatingItem === item.id
                    }
                    className="grid h-7 w-7 place-items-center rounded-full bg-gradient-primary text-primary-foreground disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <h3 className="text-sm font-semibold">
              Order summary
            </h3>

            <div className="mt-3 space-y-2 text-sm">
              <Row
                label="Subtotal"
                value={formatCurrency(
                  subtotal,
                  items[0]?.currency ?? "KES",
                )}
              />

              <div className="my-2 border-t border-dashed border-border" />

              <Row
                label="Total"
                value={formatCurrency(
                  total,
                  items[0]?.currency ?? "KES",
                )}
                bold
              />
            </div>
          </div>

          <Link
            to="/checkout"
            className="block h-13 rounded-2xl bg-gradient-primary py-3.5 text-center text-sm font-semibold text-primary-foreground shadow-soft"
          >
            Proceed to Checkout ·{" "}
            {formatCurrency(
              total,
              items[0]?.currency ?? "KES",
            )}
          </Link>
        </div>
      )}
    </AppShell>
  );
}

function formatCurrency(
  amount: number,
  currency: string,
) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          bold
            ? "font-semibold"
            : "text-muted-foreground"
        }
      >
        {label}
      </span>

      <span
        className={
          bold
            ? "text-base font-extrabold text-primary"
            : "font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}

