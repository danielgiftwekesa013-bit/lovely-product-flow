import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Package,
  Bell,
  LogOut,
  ChevronRight,
  Gift,
  Users,
  Pencil,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/profile")({
  component: Profile,
});

type ProfileUser = {
  name: string;
  email: string;
  phone: string;
};

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState<ProfileUser>({
    name: "",
    email: "",
    phone: "",
  });

  const [orders, setOrders] = useState(0);
  const [points, setPoints] = useState(0);
  const [referrals, setReferrals] = useState(0);
  const [loading, setLoading] = useState(true);

  const items: { icon: LucideIcon; label: string; to?: string }[] = [
    { icon: Package, label: "Order History", to: "/orders" },
    { icon: Gift, label: "Loyalty Rewards", to: "/rewards" },
    { icon: Users, label: "Referral Rewards", to: "/referrals" },
    { icon: Bell, label: "Notifications", to: "/notifications" },
  ];

  useEffect(() => {
    let mounted = true;

    async function fetchProfileData() {
      try {
        setLoading(true);

        // ----------------------------------------------------
        // 1. GET CURRENTLY LOGGED-IN SUPABASE USER
        // ----------------------------------------------------
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!authUser) {
          navigate({ to: "/login" });
          return;
        }

        // ----------------------------------------------------
        // 2. FETCH USER DETAILS
        // ----------------------------------------------------
        const { data: userDetails, error: userDetailsError } =
          await supabase
            .from("user_details")
            .select("id, username, email, phone_number, referral_code")
            .eq("id", authUser.id)
            .single();

        if (userDetailsError) {
          throw userDetailsError;
        }

        if (!mounted) return;

        setUser({
          name: userDetails.username || "User",
          email: userDetails.email || authUser.email || "",
          phone: userDetails.phone_number || "",
        });

        // ----------------------------------------------------
        // 3. COUNT USER'S ORDERS
        // ----------------------------------------------------
        const { count: orderCount, error: ordersError } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", authUser.id);

        if (ordersError) {
          throw ordersError;
        }

        // ----------------------------------------------------
        // 4. FETCH TOTAL USER POINTS
        // ----------------------------------------------------
        const { data: userPoints, error: pointsError } = await supabase
          .from("user_points")
          .select("total_points")
          .eq("user_id", authUser.id)
          .maybeSingle();

        if (pointsError) {
          throw pointsError;
        }

        // ----------------------------------------------------
        // 5. COUNT REFERRALS
        //
        // The logged-in user's referral_code is matched against
        // other users' invitation_code.
        //
        // Example:
        //
        // Logged-in user referral_code = PNP001
        //
        // User A invitation_code = PNP001
        // User B invitation_code = PNP001
        // User C invitation_code = PNP001
        //
        // Referral count = 3
        // ----------------------------------------------------
        let referralCount = 0;

        if (userDetails.referral_code) {
          const { count, error: referralsError } = await supabase
            .from("user_details")
            .select("id", { count: "exact", head: true })
            .eq("invitation_code", userDetails.referral_code);

          if (referralsError) {
            throw referralsError;
          }

          referralCount = count ?? 0;
        }

        if (!mounted) return;

        setOrders(orderCount ?? 0);
        setPoints(userPoints?.total_points ?? 0);
        setReferrals(referralCount);
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchProfileData();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function logout() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      navigate({ to: "/login" });
    } catch (error) {
      console.error("Error logging out:", error);
    }
  }

  return (
    <AppShell showNav>
      <div className="bg-gradient-hero px-5 pb-16 pt-12 text-primary-foreground">
        <h1 className="text-xl font-bold">My Profile</h1>
      </div>

      <div className="-mt-12 px-4">
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-2xl font-bold text-primary-foreground shadow-soft">
                {loading ? "..." : user.name.charAt(0).toUpperCase()}
              </div>

              <button className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-card shadow-soft ring-2 ring-card">
                <Pencil className="h-3 w-3" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold">
                {loading ? "Loading..." : user.name}
              </p>

              <p className="truncate text-xs text-muted-foreground">
                {loading ? "Loading..." : user.email}
              </p>

              <p className="text-xs text-muted-foreground">
                {loading ? "Loading..." : user.phone}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat
              label="Orders"
              value={loading ? "..." : orders.toString()}
            />

            <Stat
              label="Points"
              value={loading ? "..." : points.toLocaleString()}
            />

            <Stat
              label="Referrals"
              value={loading ? "..." : referrals.toString()}
            />
          </div>
        </div>

        <div className="mt-5 space-y-1.5 rounded-3xl border border-border/60 bg-card p-2 shadow-card">
          {items.map((it) => {
            const Icon = it.icon;

            const content = (
              <div className="flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-muted/60">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>

                <span className="flex-1 text-sm font-medium">
                  {it.label}
                </span>

                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            );

            return it.to ? (
              <Link key={it.label} to={it.to}>
                {content}
              </Link>
            ) : (
              <button
                key={it.label}
                className="block w-full text-left"
              >
                {content}
              </button>
            );
          })}
        </div>

        <button
          onClick={logout}
          className="mt-4 mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm font-semibold text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-muted/50 p-3 text-center">
      <p className="text-base font-extrabold text-primary">
        {value}
      </p>

      <p className="text-[11px] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

