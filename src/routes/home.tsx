import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  Search,
  Sparkles,
  TrendingUp,
  Timer,
  ShoppingBag,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import { useAppState } from "@/lib/app-state";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/home")({
  component: Home,
});

type Product = {
  id: string;
  name: string;
  description: string;
  tagline: string;
  category: string;
  image: string;
  unitsPerProduct: number;
  stockQuantity: number;
  price: number;
  discountPrice: number | null;
  currency: string;
  isFeatured: boolean;
  isPopular: boolean;
  isLimitedOffer: boolean;
};

type UserDetails = {
  id: string;
  email: string;
  username: string;
  phone_number: string | null;
  building_name: string | null;
  house_number: string | null;
};

function Home() {
  const { state } = useAppState();

  const [userDetails, setUserDetails] =
    useState<UserDetails | null>(null);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [addingProductId, setAddingProductId] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadHomeData() {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          throw new Error(
            "You must be logged in to view this page.",
          );
        }

        const {
          data: profile,
          error: profileError,
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
            `,
          )
          .eq("id", user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        setUserDetails(profile);

        const {
          data: productData,
          error: productsError,
        } = await supabase
          .from("products")
          .select(
            `
              id,
              product_name,
              description,
              category,
              units_per_product,
              stock_quantity,
              price,
              discount_price,
              currency,
              is_featured,
              is_popular,
              is_limited_offer,
              image_url
            `,
          )
          .eq("is_active", true)
          .order("created_at", {
            ascending: false,
          });

        if (productsError) {
          throw productsError;
        }

        const formattedProducts: Product[] =
          (productData ?? []).map((product) => ({
            id: product.id,
            name: product.product_name,
            description:
              product.description ?? "",
            tagline:
              product.description ?? "",
            category: product.category,
            image:
              product.image_url ??
              "/placeholder-product.png",
            unitsPerProduct:
              product.units_per_product,
            stockQuantity:
              product.stock_quantity,
            price: Number(product.price),
            discountPrice:
              product.discount_price !== null
                ? Number(product.discount_price)
                : null,
            currency: product.currency,
            isFeatured:
              product.is_featured,
            isPopular:
              product.is_popular,
            isLimitedOffer:
              product.is_limited_offer,
          }));

        setProducts(formattedProducts);
      } catch (err) {
        console.error(
          "Failed to load home data:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading the home page.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadHomeData();
  }, []);

  /*
   * Adds a product to the authenticated user's
   * pending order.
   *
   * Flow:
   *
   * 1. Get authenticated user
   * 2. Find existing pending order
   * 3. If none exists, create one
   * 4. Check whether product is already in order_items
   * 5. If yes, increase quantity
   * 6. If no, insert new order_item
   * 7. Recalculate order subtotal and total
   */
  async function addToOrder(
    product: Product,
    redirectToCheckout = false,
  ) {
    try {
      setAddingProductId(product.id);
      setError(null);
      setSuccessMessage(null);

      // Get authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          "You must be logged in to add products.",
        );
      }

      // The price used for the order is the discounted
      // price when one exists.
      const unitPrice =
        product.discountPrice ??
        product.price;

      /*
       * Find the user's existing pending order.
       *
       * This ensures every customer has their own
       * separate order.
       */
      const {
        data: existingOrder,
        error: orderFetchError,
      } = await supabase
        .from("orders")
        .select(
          `
            id,
            subtotal,
            total_amount,
            currency
          `,
        )
        .eq("user_id", user.id)
        .eq("order_status", "pending")
        .eq("payment_status", "pending")
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (orderFetchError) {
        throw orderFetchError;
      }

      let orderId: string;

      /*
       * Create a new pending order if the customer
       * does not already have one.
       *
       * Only information available on the Home page
       * is inserted here.
       *
       * Customer delivery information and payment
       * details are intentionally left NULL for checkout.
       */
      if (!existingOrder) {
        const orderNumber =
          `ORD-${Date.now()}-${Math.floor(
            Math.random() * 10000,
          )}`;

        const {
          data: newOrder,
          error: createOrderError,
        } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            order_number: orderNumber,
            subtotal: 0,
            total_amount: 0,
            currency: product.currency,
            order_status: "pending",
            payment_status: "pending",
          })
          .select("id")
          .single();

        if (createOrderError) {
          throw createOrderError;
        }

        orderId = newOrder.id;
      } else {
        orderId = existingOrder.id;
      }

      /*
       * Check if this product already exists
       * in the customer's pending order.
       */
      const {
        data: existingItem,
        error: itemFetchError,
      } = await supabase
        .from("order_items")
        .select(
          `
            id,
            quantity,
            unit_price
          `,
        )
        .eq("order_id", orderId)
        .eq("product_id", product.id)
        .maybeSingle();

      if (itemFetchError) {
        throw itemFetchError;
      }

      if (existingItem) {
        /*
         * Product already exists.
         * Increase quantity by 1.
         */
        const newQuantity =
          existingItem.quantity + 1;

        const newTotalAmount =
          Number(existingItem.unit_price) *
          newQuantity;

        const {
          error: updateItemError,
        } = await supabase
          .from("order_items")
          .update({
            quantity: newQuantity,
            total_amount: newTotalAmount,
          })
          .eq("id", existingItem.id);

        if (updateItemError) {
          throw updateItemError;
        }
      } else {
        /*
         * Product does not exist in the order.
         * Add it as a new order item.
         */
        const {
          error: insertItemError,
        } = await supabase
          .from("order_items")
          .insert({
            order_id: orderId,
            product_id: product.id,
            product_name: product.name,
            product_image_url: product.image,
            unit_price: unitPrice,
            quantity: 1,
            total_amount: unitPrice,
            currency: product.currency,
          });

        if (insertItemError) {
          throw insertItemError;
        }
      }

      /*
       * Recalculate the complete order total
       * from all order items.
       */
      const {
        data: orderItems,
        error: itemsFetchError,
      } = await supabase
        .from("order_items")
        .select(
          `
            quantity,
            unit_price,
            total_amount
          `,
        )
        .eq("order_id", orderId);

      if (itemsFetchError) {
        throw itemsFetchError;
      }

      const subtotal =
        (orderItems ?? []).reduce(
          (sum, item) =>
            sum + Number(item.total_amount),
          0,
        );

      /*
       * No delivery fee.
       *
       * Therefore:
       * subtotal = total_amount
       */
      const totalAmount = subtotal;

      const {
        error: updateOrderError,
      } = await supabase
        .from("orders")
        .update({
          subtotal,
          total_amount: totalAmount,
        })
        .eq("id", orderId);

      if (updateOrderError) {
        throw updateOrderError;
      }

      setSuccessMessage(
        `${product.name} added to your cart.`,
      );

      /*
       * Buy Now:
       * After saving the product to Supabase,
       * take the customer directly to checkout.
       *
       * The checkout page can now fetch the pending
       * order and its order_items from Supabase.
       */
      if (redirectToCheckout) {
        window.location.href = "/checkout";
      }
    } catch (err) {
      console.error(
        "Failed to add product to order:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to add product to your cart.",
      );
    } finally {
      setAddingProductId(null);
    }
  }

  const featuredProducts =
    products.filter(
      (product) => product.isFeatured,
    );

  const popularProducts =
    products.filter(
      (product) => product.isPopular,
    );

  const limitedOfferProducts =
    products.filter(
      (product) => product.isLimitedOffer,
    );

  const displayName =
    userDetails?.username ||
    state.user.name ||
    "there";

  return (
    <AppShell showNav>
      <div className="bg-gradient-hero px-5 pb-8 pt-12 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-white/80">
              Good morning
            </p>

            <h1 className="text-2xl font-extrabold tracking-tight">
              Hi,{" "}
              {displayName.split(" ")[0]} 👋
            </h1>
          </div>

          <Link
            to="/notifications"
            className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white/20 backdrop-blur"
          >
            <Bell className="h-5 w-5" />

            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-white/30" />
          </Link>
        </div>

        <Link
          to="/search"
          className="mt-5 flex h-12 items-center gap-3 rounded-2xl bg-white/95 px-4 text-sm text-muted-foreground shadow-soft"
        >
          <Search className="h-4 w-4" />
          Search products...
        </Link>
      </div>

      <div className="-mt-6 space-y-8 px-5">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-primary-glow/20 p-5 shadow-card">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />

          <div className="relative flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-soft">
              <Sparkles className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Members save more
              </p>

              <p className="mt-0.5 truncate text-sm font-semibold">
                Up to 20% off with Verde points
              </p>
            </div>

            <Link
              to="/rewards"
              className="rounded-full bg-foreground/90 px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
            >
              Redeem
            </Link>
          </div>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary">
              {successMessage}
            </p>

            <Link
              to="/cart"
              className="mt-1 inline-block text-xs font-semibold text-primary underline"
            >
              View cart
            </Link>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-destructive">
              Unable to add product
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {error}
            </p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-2 gap-3.5">
            {[1, 2, 3, 4].map(
              (item) => (
                <div
                  key={item}
                  className="aspect-[0.85] animate-pulse rounded-2xl bg-muted"
                />
              ),
            )}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Featured */}
            <section>
              <SectionHeader
                icon={
                  <Sparkles className="h-4 w-4" />
                }
                title="Featured products"
              />

              <div className="mt-4 grid grid-cols-2 gap-3.5">
                {featuredProducts.length >
                0 ? (
                  featuredProducts.map(
                    (product) => (
                      <div
                        key={product.id}
                        className="relative flex flex-col"
                      >
                        <ProductCard
                          product={product}
                        />

                        {/* + button */}
                        <button
                          onClick={() =>
                            addToOrder(product)
                          }
                          disabled={
                            addingProductId ===
                            product.id
                          }
                          className="mt-2 flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground shadow-soft transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4" />

                          {addingProductId ===
                          product.id
                            ? "Adding..."
                            : "Add to cart"}
                        </button>
                      </div>
                    ),
                  )
                ) : (
                  <p className="col-span-2 py-6 text-center text-sm text-muted-foreground">
                    No featured products available.
                  </p>
                )}
              </div>
            </section>

            {/* Popular */}
            <section>
              <SectionHeader
                icon={
                  <TrendingUp className="h-4 w-4" />
                }
                title="Popular picks"
              />

              <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {popularProducts.length >
                0 ? (
                  popularProducts.map(
                    (product) => (
                      <div
                        key={product.id}
                        className="w-44 shrink-0"
                      >
                        <Link
                          to="/product/$id"
                          params={{
                            id: product.id,
                          }}
                          className="block rounded-2xl border border-border/60 bg-card p-3 shadow-card"
                        >
                          <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                            <img
                              src={product.image}
                              alt={product.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <p className="mt-2 truncate text-sm font-semibold">
                            {product.name}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {product.category}
                          </p>
                        </Link>

                        {/* + button */}
                        <button
                          onClick={() =>
                            addToOrder(product)
                          }
                          disabled={
                            addingProductId ===
                            product.id
                          }
                          className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Plus className="h-3.5 w-3.5" />

                          {addingProductId ===
                          product.id
                            ? "Adding..."
                            : "Add to cart"}
                        </button>
                      </div>
                    ),
                  )
                ) : (
                  <p className="py-6 text-sm text-muted-foreground">
                    No popular products available.
                  </p>
                )}
              </div>
            </section>

            {/* Limited */}
            <section className="pb-6">
              <SectionHeader
                icon={
                  <Timer className="h-4 w-4" />
                }
                title="Limited offers"
              />

              <div className="mt-4 space-y-3">
                {limitedOfferProducts.length >
                0 ? (
                  limitedOfferProducts.map(
                    (product) => (
                      <div
                        key={product.id}
                        className="rounded-2xl border border-border/60 bg-card p-3 shadow-card"
                      >
                        <Link
                          to="/product/$id"
                          params={{
                            id: product.id,
                          }}
                          className="flex items-center gap-4"
                        >
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                            <img
                              src={product.image}
                              alt={product.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {product.name}
                            </p>

                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {product.tagline}
                            </p>

                            <div className="mt-1 flex items-center gap-2">
                              {product.discountPrice !==
                                null && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                  {Math.round(
                                    ((product.price -
                                      product.discountPrice) /
                                      product.price) *
                                      100,
                                  )}
                                  % off
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>

                        {/* + button */}
                        <button
                          onClick={() =>
                            addToOrder(product)
                          }
                          disabled={
                            addingProductId ===
                            product.id
                          }
                          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4" />

                          {addingProductId ===
                          product.id
                            ? "Adding..."
                            : "Add to cart"}
                        </button>
                      </div>
                    ),
                  )
                ) : (
                  <p className="py-6 text-sm text-muted-foreground">
                    No limited offers available.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>

        <h2 className="text-base font-bold">
          {title}
        </h2>
      </div>

      <button className="text-xs font-semibold text-primary">
        See all
      </button>
    </div>
  );
}

