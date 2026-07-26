import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/lib/app-state";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/product/$id")({
  component: ProductDetail,
});

type Product = {
  id: string;
  product_name: string;
  description: string | null;
  category: string;
  units_per_product: number;
  stock_quantity: number;
  price: number;
  discount_price: number | null;
  currency: string;
  image_url: string | null;
};

function ProductDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { addToCart } = useAppState();

  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [img, setImg] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetchProduct() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("products")
          .select(`
            id,
            product_name,
            description,
            category,
            units_per_product,
            stock_quantity,
            price,
            discount_price,
            currency,
            image_url
          `)
          .eq("id", id)
          .eq("is_active", true)
          .single();

        if (error) {
          throw error;
        }

        if (!mounted) return;

        setProduct(data);
      } catch (error) {
        console.error("Error fetching product:", error);

        if (mounted) {
          setProduct(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchProduct();

    return () => {
      mounted = false;
    };
  }, [id]);

  // ----------------------------------------------------
  // LOADING STATE
  // ----------------------------------------------------
  if (loading) {
    return (
      <AppShell title="Product" back="/home">
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Loading product...
          </p>
        </div>
      </AppShell>
    );
  }

  // ----------------------------------------------------
  // PRODUCT NOT FOUND
  // ----------------------------------------------------
  if (!product) {
    return (
      <AppShell title="Not found" back="/home">
        <p className="p-6 text-sm text-muted-foreground">
          Product not found.
        </p>
      </AppShell>
    );
  }

  // ----------------------------------------------------
  // PRODUCT PRICE
  // Uses discount_price when available,
  // otherwise uses the regular price.
  // ----------------------------------------------------
  const currentPrice =
    product.discount_price !== null
      ? Number(product.discount_price)
      : Number(product.price);

  // ----------------------------------------------------
  // FORMAT CURRENCY
  // ----------------------------------------------------
  const formatCurrency = (
    amount: number,
    currency: string = "KES"
  ) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // ----------------------------------------------------
  // PRODUCT IMAGE
  // Your current products table has one image_url field,
  // so the product currently has one gallery image.
  // ----------------------------------------------------
  const gallery =
    product.image_url
      ? [product.image_url]
      : [];

  return (
    <AppShell showNav={false} bare>
      <div className="flex min-h-screen flex-col md:min-h-[820px]">
        <div className="relative bg-gradient-to-br from-muted to-accent/60 pb-6 pt-14">
          <div className="absolute left-4 top-4 z-10">
            <Link
              to="/home"
              className="grid h-10 w-10 place-items-center rounded-full bg-card/90 backdrop-blur shadow-soft"
            >
              ←
            </Link>
          </div>

          <div className="mx-auto flex aspect-square w-72 items-center justify-center">
            {gallery.length > 0 ? (
              <img
                src={gallery[img]}
                alt={product.product_name}
                className="h-full w-full rounded-3xl object-cover shadow-elegant pop-in"
                key={img}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-3xl bg-muted text-sm text-muted-foreground">
                No image available
              </div>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              {gallery.map((g, i) => (
                <button
                  key={g}
                  onClick={() => setImg(i)}
                  className={`h-14 w-14 overflow-hidden rounded-xl border-2 transition-all ${
                    i === img
                      ? "border-primary shadow-soft"
                      : "border-transparent opacity-70"
                  }`}
                >
                  <img
                    src={g}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-6 rounded-t-3xl bg-card px-5 py-6 -mt-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {product.category}
            </p>

            <div className="mt-1 flex items-start justify-between gap-4">
              <h1 className="text-2xl font-extrabold">
                {product.product_name}
              </h1>

              <span className="whitespace-nowrap text-xl font-extrabold text-primary">
                {formatCurrency(
                  currentPrice,
                  product.currency
                )}
              </span>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              {product.units_per_product}{" "}
              {product.units_per_product === 1
                ? "unit"
                : "units"}{" "}
              per product
            </p>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-muted/60 p-3">
            <span className="text-sm font-semibold">
              Quantity
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setQty(Math.max(1, qty - 1))
                }
                className="grid h-8 w-8 place-items-center rounded-full bg-card shadow-soft"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>

              <span className="w-6 text-center font-semibold">
                {qty}
              </span>

              <button
                onClick={() =>
                  setQty(
                    Math.min(
                      product.stock_quantity,
                      qty + 1
                    )
                  )
                }
                disabled={product.stock_quantity <= qty}
                className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">
              About this product
            </h3>

            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {product.description ||
                "No description available for this product."}
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-border/50 bg-card/95 p-4 backdrop-blur">
          <button
            onClick={() =>
              addToCart(product.id, qty)
            }
            disabled={product.stock_quantity <= 0}
            className="h-13 flex-1 rounded-2xl border-2 border-primary py-3.5 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add to Cart
          </button>

          <button
            onClick={() => {
              addToCart(product.id, qty);
              navigate({ to: "/checkout" });
            }}
            disabled={product.stock_quantity <= 0}
            className="h-13 flex-1 rounded-2xl bg-gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            Buy Now
          </button>
        </div>
      </div>
    </AppShell>
  );
}