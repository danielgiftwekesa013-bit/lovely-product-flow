import { createFileRoute } from "@tanstack/react-router";
import {
  Copy,
  Share2,
  Users,
  Gift,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/referrals")({
  component: Referrals,
});

type ReferredUser = {
  id: string;
  username: string;
  created_at: string;
};

function Referrals() {
  const [referralCode, setReferralCode] = useState("");
  const [referralPoints, setReferralPoints] = useState(0);
  const [referrals, setReferrals] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchReferralData() {
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
            setLoading(false);
          }
          return;
        }

        // ----------------------------------------------------
        // 2. GET THE LOGGED-IN USER'S REFERRAL CODE
        // ----------------------------------------------------
        const { data: userDetails, error: userDetailsError } =
          await supabase
            .from("user_details")
            .select("referral_code")
            .eq("id", user.id)
            .single();

        if (userDetailsError) {
          throw userDetailsError;
        }

        const code = userDetails?.referral_code ?? "";

        // ----------------------------------------------------
        // 3. GET THE LOGGED-IN USER'S REFERRAL POINTS
        // ----------------------------------------------------
        const { data: pointsData, error: pointsError } =
          await supabase
            .from("user_points")
            .select("referral_points")
            .eq("user_id", user.id)
            .maybeSingle();

        if (pointsError) {
          throw pointsError;
        }

        // ----------------------------------------------------
        // 4. FIND REFERRED USERS
        //
        // A referred user is any user whose invitation_code
        // matches the logged-in user's referral_code.
        //
        // Example:
        //
        // Logged-in user:
        // referral_code = PNP001
        //
        // Referred users:
        // invitation_code = PNP001
        //
        // The newest 3 users are displayed.
        // ----------------------------------------------------
        let referredUsers: ReferredUser[] = [];

        if (code) {
          const {
            data: referredUsersData,
            error: referredUsersError,
          } = await supabase
            .from("user_details")
            .select("id, username, created_at")
            .eq("invitation_code", code)
            .order("created_at", { ascending: false })
            .limit(3);

          if (referredUsersError) {
            throw referredUsersError;
          }

          referredUsers = referredUsersData ?? [];
        }

        if (!mounted) return;

        setReferralCode(code);
        setReferralPoints(
          pointsData?.referral_points ?? 0
        );
        setReferrals(referredUsers);
      } catch (error) {
        console.error(
          "Error fetching referral data:",
          error
        );

        if (mounted) {
          setReferralCode("");
          setReferralPoints(0);
          setReferrals([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchReferralData();

    return () => {
      mounted = false;
    };
  }, []);

  // ----------------------------------------------------
  // COPY REFERRAL CODE
  // ----------------------------------------------------
  async function handleCopy() {
    if (!referralCode) return;

    try {
      await navigator.clipboard.writeText(
        referralCode
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Failed to copy referral code:",
        error
      );
    }
  }

  // ----------------------------------------------------
  // SHARE REFERRAL CODE
  // ----------------------------------------------------
  async function handleShare() {
    if (!referralCode) return;

    const shareText =
      `Join me and shop with us! Use my referral code ${referralCode} when you sign up.`;

    try {
      if (
        navigator.share &&
        typeof navigator.share === "function"
      ) {
        await navigator.share({
          title: "Join us",
          text: shareText,
        });

        return;
      }

      // Fallback for browsers that don't support
      // the Web Share API.
      await navigator.clipboard.writeText(
        shareText
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      // Ignore the error when the user simply
      // cancels the native share dialog.
      console.error(
        "Share action cancelled or failed:",
        error
      );
    }
  }

  // ----------------------------------------------------
  // FORMAT REFERRAL DATE
  // ----------------------------------------------------
  function formatDate(date: string) {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
    }).format(new Date(date));
  }

  return (
    <AppShell title="Referral Rewards" back="/profile">
      <div className="space-y-5 px-4 pt-4 pb-6">
        <div className="rounded-3xl bg-gradient-hero p-5 text-primary-foreground shadow-elegant">
          <p className="text-xs text-white/80">
            Your referral code
          </p>

          <p className="mt-1 text-3xl font-extrabold tracking-wider">
            {loading
              ? "Loading..."
              : referralCode || "No code"}
          </p>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCopy}
              disabled={
                loading || !referralCode
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/20 py-2.5 text-xs font-semibold backdrop-blur disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" />

              {copied ? "Copied!" : "Copy"}
            </button>

            <button
              onClick={handleShare}
              disabled={
                loading || !referralCode
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Share2 className="h-3.5 w-3.5" />

              Share
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Users}
            label="Successful referrals"
            value={
              loading
                ? "..."
                : referrals.length.toString()
            }
          />

          <StatCard
            icon={Gift}
            label="Referral points"
            value={
              loading
                ? "..."
                : referralPoints.toLocaleString()
            }
          />
        </div>

        <button
          onClick={handleShare}
          disabled={
            loading || !referralCode
          }
          className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          Invite Friends
        </button>

        <section>
          <h3 className="mb-3 text-sm font-bold">
            How it works
          </h3>

          <div className="space-y-2">
            {[
              {
                t: "Share your code",
                d: "Send it to friends and family.",
              },
              {
                t: "They shop",
                d: "Your friend places their first order using your code.",
              },
              {
                t: "You both earn",
                d: "Get 250 points each after their delivery.",
              },
            ].map((s, i) => (
              <div
                key={s.t}
                className="flex gap-3 rounded-2xl border border-border/60 bg-card p-3.5 shadow-card"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 font-bold text-primary">
                  {i + 1}
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    {s.t}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {s.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-bold">
            Referral history
          </h3>

          <div className="space-y-2">
            {loading ? (
              <div className="rounded-2xl border border-border/60 bg-card p-3.5 text-center shadow-card">
                <p className="text-xs text-muted-foreground">
                  Loading referrals...
                </p>
              </div>
            ) : referrals.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-card p-3.5 text-center shadow-card">
                <p className="text-xs text-muted-foreground">
                  No referrals yet.
                </p>
              </div>
            ) : (
              referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-3.5 shadow-card"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {referral.username}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {formatDate(
                        referral.created_at
                      )}{" "}
                      · Referred
                    </p>
                  </div>

                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                    Referred
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
      <Icon className="h-5 w-5 text-primary" />

      <p className="mt-2 text-2xl font-extrabold">
        {value}
      </p>

      <p className="text-xs text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

