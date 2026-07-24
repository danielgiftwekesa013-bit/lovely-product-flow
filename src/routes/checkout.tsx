import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Smartphone, Check, Pencil, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
});

type UserDetails = {
  id: string;
  email: string;
  username: string;
  phone_number: string | null;
  building_name: string | null;
  house_number: string | null;
};

type OrderItem = {
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

type Order = {
  id: string;
  user_id: string;
  order_number: string;
  subtotal: number;
  total_amount: number;
  currency: string;
  order_status: string;
  payment_status: string;
  payment_method: string | null;
  payment_reference: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  building_name: string | null;
  house_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const KSH = (n: number) =>
  "KSh " +
  Number(n || 0).toLocaleString("en-KE", {
    maximumFractionDigits: 0,
  });

function Checkout() {
  const navigate = useNavigate();

  const [user, setUser] = useState<UserDetails | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Address editing
  const [editingAddress, setEditingAddress] = useState(false);
  const [buildingName, setBuildingName] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  // STK Push phone
  const [stkPhone, setStkPhone] = useState("");

  /*
   * Fetch the authenticated user, user details,
   * existing pending order and its order items.
   */
  useEffect(() => {
    const loadCheckout = async () => {
      setLoading(true);
      setError("");

      try {
        // Get the current Supabase authentication session.
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          navigate({ to: "/login" });
          return;
        }

        const userId = session.user.id;

        /*
         * Fetch user details.
         * user_details.id is linked to auth.users.id.
         */
        const {
          data: userDetails,
          error: userError,
        } = await supabase
          .from("user_details")
          .select(
            `
              id,
              email,
              username,
              phone_number,
              building_name,
              house_number
            `
          )
          .eq("id", userId)
          .single();

        if (userError) {
          throw userError;
        }

        /*
         * Find the existing pending order belonging
         * to the authenticated user.
         *
         * We do NOT create a new order here.
         */
        const {
          data: existingOrder,
          error: orderError,
        } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", userId)
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

        if (!existingOrder) {
          setUser(userDetails);
          setBuildingName(userDetails.building_name ?? "");
          setHouseNumber(userDetails.house_number ?? "");
          setStkPhone(userDetails.phone_number ?? "");

          setError(
            "No pending order was found. Please return to your cart and try again."
          );

          return;
        }

        /*
         * Fetch the items that already belong
         * to this existing order.
         */
        const {
          data: orderItems,
          error: itemsError,
        } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", existingOrder.id)
          .order("created_at", {
            ascending: true,
          });

        if (itemsError) {
          throw itemsError;
        }

        setUser(userDetails);
        setOrder(existingOrder);
        setItems(orderItems ?? []);

        /*
         * Address initially comes from user_details.
         *
         * If the order already has an address saved,
         * use the order's address instead.
         */
        setBuildingName(
          existingOrder.building_name ??
            userDetails.building_name ??
            ""
        );

        setHouseNumber(
          existingOrder.house_number ??
            userDetails.house_number ??
            ""
        );

        /*
         * STK phone initially comes from the order
         * if it already exists, otherwise user_details.
         */
        setStkPhone(
          existingOrder.customer_phone ??
            userDetails.phone_number ??
            ""
        );
      } catch (err: any) {
        console.error(
          "Checkout loading error:",
          err
        );

        setError(
          err?.message ??
            "Unable to load checkout details."
        );
      } finally {
        setLoading(false);
      }
    };

    loadCheckout();
  }, [navigate]);

  /*
   * Save changed building and house number
   * directly to the existing orders row.
   */
  const saveAddress = async () => {
    if (!order || !user) return;

    if (!buildingName.trim()) {
      setError("Please enter your building name.");
      return;
    }

    if (!houseNumber.trim()) {
      setError("Please enter your house number.");
      return;
    }

    setSavingAddress(true);
    setError("");

    try {
      const {
        data: {
          session,
        },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      /*
       * Update only the order belonging to the
       * currently authenticated user.
       */
      const {
        data: updatedOrder,
        error: updateError,
      } = await supabase
        .from("orders")
        .update({
          building_name: buildingName.trim(),
          house_number: houseNumber.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("user_id", session.user.id)
        .select("*")
        .single();

      if (updateError) {
        throw updateError;
      }

      setOrder(updatedOrder);
      setEditingAddress(false);
    } catch (err: any) {
      console.error(
        "Address update error:",
        err
      );

      setError(
        err?.message ??
          "Unable to update your delivery address."
      );
    } finally {
      setSavingAddress(false);
    }
  };

  /*
   * Save the phone number that will receive
   * the M-Pesa STK Push.
   */
  const saveStkPhone = async () => {
    if (!order || !stkPhone.trim()) {
      throw new Error(
        "Please enter a phone number for the M-Pesa STK Push."
      );
    }

    const {
      data: {
        session,
      },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    const {
      data: updatedOrder,
      error: updateError,
    } = await supabase
      .from("orders")
      .update({
        customer_phone: stkPhone.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("user_id", session.user.id)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    setOrder(updatedOrder);
  };

  /*
   * Wait for the M-Pesa callback to update
   * the payment status in Supabase.
   *
   * The STK Push endpoint only confirms that
   * the prompt was successfully initiated.
   */
  const waitForPaymentConfirmation = async () => {
    if (!order) {
      throw new Error("No order available.");
    }

    const maxAttempts = 60;
    const intervalMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const {
        data: currentOrder,
        error: orderError,
      } = await supabase
        .from("orders")
        .select("*")
        .eq("id", order.id)
        .single();

      if (orderError) {
        throw orderError;
      }

      setOrder(currentOrder);

      /*
       * Callback successfully confirmed payment.
       */
      if (
        currentOrder.payment_status === "paid"
      ) {
        return true;
      }

      /*
       * Callback confirmed payment failure.
       */
      if (
        currentOrder.payment_status === "failed"
      ) {
        throw new Error(
          "M-Pesa payment was not completed."
        );
      }

      /*
       * Wait before checking again.
       */
      await new Promise((resolve) =>
        setTimeout(resolve, intervalMs)
      );
    }

    /*
     * The STK prompt may still be pending,
     * so do not mark the order as failed here.
     */
    return false;
  };

  /*
   * Initiate M-Pesa STK Push.
   *
   * The amount is NOT trusted from the frontend.
   * The backend should fetch the order from Supabase
   * and use the database total_amount.
   */
  const pay = async () => {
    if (!order) {
      setError("No order available for payment.");
      return;
    }

    if (items.length === 0) {
      setError(
        "This order has no items. Please return to your cart."
      );
      return;
    }

    if (!stkPhone.trim()) {
      setError(
        "Please enter the phone number that should receive the STK Push."
      );
      return;
    }

    setProcessing(true);
    setDone(false);
    setError("");

    try {
      /*
       * Make sure the latest STK phone number
       * is stored on the order.
       */
      await saveStkPhone();

      /*
       * Call the Vercel serverless function.
       *
       * Do not put Safaricom consumer key,
       * consumer secret, passkey or other secrets
       * in this frontend file.
       */
      
/*
 * Get the current Supabase authentication session.
 * The access token is required by the Vercel
 * STK Push API to verify the authenticated user.
 */
const {
  data: {
    session,
  },
  error: sessionError,
} = await supabase.auth.getSession();

if (sessionError) {
  throw sessionError;
}

if (!session?.access_token) {
  throw new Error(
    "Your session has expired. Please log in again."
  );
}

/*
 * Call the Vercel serverless function.
 *
 * The Supabase access token is sent in the
 * Authorization header so the server can verify
 * that this order belongs to the logged-in user.
 */
const response = await fetch(
  "/api/payments/stkpush",
  {
    method: "POST",

    headers: {
      "Content-Type":
        "application/json",

      Authorization:
        `Bearer ${session.access_token}`,
    },

    body: JSON.stringify({
      orderId:
        order.id,

      phoneNumber:
        stkPhone.trim(),
    }),
  }
);

const result =
  await response.json();

if (!response.ok) {
  throw new Error(
    result?.error ??
      "Unable to initiate M-Pesa STK Push."
  );
}



      
      /*
       * The STK Push has been successfully initiated.
       * This does NOT mean that payment is complete.
       *
       * The callback must confirm payment and update:
       *
       * payment_status = "paid"
       * order_status = "processing"
       */
      const paymentConfirmed =
        await waitForPaymentConfirmation();

      if (!paymentConfirmed) {
        setError(
          "The M-Pesa prompt was sent. Payment confirmation is still pending. Please complete the payment on your phone and check your orders shortly."
        );

        return;
      }

      /*
       * The callback has confirmed successful payment.
       */
      setDone(true);

      /*
       * Give the customer a moment to see
       * the successful payment message.
       */
      setTimeout(() => {
        navigate({ to: "/orders" });
      }, 1600);
    } catch (err: any) {
      console.error(
        "M-Pesa payment error:",
        err
      );

      setError(
        err?.message ??
          "Unable to initiate M-Pesa payment."
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <AppShell
        title="Checkout"
        back="/cart"
        showNav={false}
      >
        <div className="grid min-h-[60vh] place-items-center px-4">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Loading your checkout...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell
        title="Checkout"
        back="/cart"
        showNav={false}
      >
        <div className="space-y-4 px-4 pt-6">
          <div className="rounded-2xl border border-border/60 bg-card p-5 text-center shadow-card">
            <h3 className="text-base font-bold">
              No pending order found
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              {error ||
                "We could not find an order ready for checkout."}
            </p>

            <button
              onClick={() =>
                navigate({ to: "/cart" })
              }
              className="mt-5 h-12 w-full rounded-2xl bg-gradient-primary text-sm font-bold text-primary-foreground"
            >
              Return to Cart
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const subtotal = Number(order.subtotal || 0);

  /*
   * The order table already contains total_amount.
   * We therefore use the database value as the
   * final amount to pay.
   */
  const total = Number(order.total_amount || 0);

  /*
   * This is only for displaying the delivery line.
   * Your orders table does not have a delivery_amount column.
   *
   * If your Home page stores delivery inside total_amount,
   * this calculation assumes KSh 200 delivery.
   */
  const delivery = Math.max(
    0,
    total - subtotal
  );

  return (
    <AppShell
      title="Checkout"
      back="/cart"
      showNav={false}
    >
      <div className="space-y-5 px-4 pt-4 pb-24">
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Address */}
        <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </span>

              <h3 className="text-sm font-semibold">
                Delivery Address
              </h3>
            </div>

            {!editingAddress ? (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setEditingAddress(true);
                }}
                className="flex items-center gap-1 text-xs font-semibold text-primary"
              >
                <Pencil className="h-3 w-3" />
                Change
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setEditingAddress(false)
                }
                className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
            )}
          </div>

          {!editingAddress ? (
            <div className="rounded-xl bg-muted/50 p-3 text-sm">
              <p className="font-semibold">
                Home ·{" "}
                {user?.username ??
                  order.customer_name ??
                  "Customer"}
              </p>

              <p className="mt-0.5 text-xs text-muted-foreground">
                {order.building_name ||
                  user?.building_name ||
                  "Building not provided"}
                {" · "}
                {order.house_number ||
                  user?.house_number ||
                  "House number not provided"}
              </p>

              <p className="text-xs text-muted-foreground">
                Nairobi
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {order.customer_phone ||
                  user?.phone_number ||
                  ""}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold">
                  Building Name
                </label>

                <input
                  type="text"
                  value={buildingName}
                  onChange={(e) =>
                    setBuildingName(
                      e.target.value
                    )
                  }
                  placeholder="Enter building name"
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold">
                  House / Apartment Number
                </label>

                <input
                  type="text"
                  value={houseNumber}
                  onChange={(e) =>
                    setHouseNumber(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Apt 4B"
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
                />
              </div>

              <button
                type="button"
                disabled={savingAddress}
                onClick={saveAddress}
                className="h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {savingAddress
                  ? "Saving..."
                  : "Save Address"}
              </button>
            </div>
          )}
        </section>

        {/* Payment */}
        <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold">
            Payment Method
          </h3>

          <label className="flex items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 p-3">
            <input
              type="radio"
              checked
              readOnly
              className="accent-[oklch(0.62_0.17_152)]"
            />

            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
              <Smartphone className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                M-Pesa
              </p>

              <p className="text-xs text-muted-foreground">
                Pay via STK Push
              </p>
            </div>
          </label>

          {/* STK Push phone number */}
          <div className="mt-3">
            <label className="mb-1.5 block text-xs font-semibold">
              M-Pesa Phone Number
            </label>

            <input
              type="tel"
              value={stkPhone}
              onChange={(e) =>
                setStkPhone(e.target.value)
              }
              placeholder="e.g. 0712345678"
              disabled={processing}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:opacity-60"
            />

            <p className="mt-1.5 text-[11px] text-muted-foreground">
              You can change this number if you want
              the STK Push sent to a different phone.
            </p>
          </div>
        </section>

        {/* Summary */}
        <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold">
            Order summary
          </h3>

          <div className="space-y-2 text-sm">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-4 text-xs"
              >
                <span className="text-muted-foreground">
                  {item.product_name} ×{" "}
                  {item.quantity}
                </span>

                <span className="font-medium">
                  {KSH(item.total_amount)}
                </span>
              </div>
            ))}

            <div className="my-2 border-t border-dashed border-border" />

            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Delivery
              </span>

              <span className="font-medium">
                {KSH(delivery)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold">
                Total amount
              </span>

              <span className="text-xl font-extrabold text-primary">
                {KSH(total)}
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 border-t border-border/50 bg-card/95 p-4 backdrop-blur">
        <button
          disabled={
            items.length === 0 ||
            processing ||
            !stkPhone.trim()
          }
          onClick={pay}
          className="h-14 w-full rounded-2xl bg-gradient-primary text-sm font-bold text-primary-foreground shadow-soft transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {processing
            ? "Processing..."
            : `Pay ${KSH(total)} with M-Pesa`}
        </button>
      </div>

      {(processing || done) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-6 backdrop-blur-sm">
          <div className="pop-in w-full max-w-xs rounded-3xl bg-card p-6 text-center shadow-elegant">
            {done ? (
              <>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft">
                  <Check
                    className="h-8 w-8"
                    strokeWidth={3}
                  />
                </div>

                <h3 className="mt-4 text-lg font-bold">
                  Payment successful!
                </h3>

                <p className="mt-1 text-xs text-muted-foreground">
                  Your M-Pesa payment has been confirmed.
                </p>

                <p className="mt-3 text-[11px] text-muted-foreground">
                  Redirecting to your orders...
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto h-16 w-16">
                  <div className="h-full w-full animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                </div>

                <h3 className="mt-4 text-base font-bold">
                  Awaiting M-Pesa...
                </h3>

                <p className="mt-1 text-xs text-muted-foreground">
                  Check your phone for the STK Push
                  prompt.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

