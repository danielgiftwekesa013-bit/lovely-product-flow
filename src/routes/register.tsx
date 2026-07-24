import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { MobileFrame } from "@/components/MobileFrame";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/register")({
  component: Register,
});

function Register() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [invitationCode, setInvitationCode] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setLoading(true);

    // Create Auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    const user = data.user;

    if (!user) {
      setLoading(false);
      alert("Unable to create account.");
      return;
    }

    // Store extra profile data
    const { error: profileError } = await supabase
      .from("user_details")
      .insert({
        id: user.id,
        email,
        username,
        phone_number: phone || null,
        building_name: buildingName,
        house_number: houseNumber || null,
        referral_code: referralCode || null,
        invitation_code: invitationCode || null,
      });

    setLoading(false);

    if (profileError) {
      alert(profileError.message);
      return;
    }

    alert("Account created successfully.");

    navigate({
      to: "/home",
    });
  }

  return (
    <MobileFrame>
      <div className="flex min-h-screen flex-col px-6 py-8 md:min-h-[820px]">

        <Link
          to="/login"
          className="grid h-10 w-10 place-items-center rounded-full bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="mt-6">
          <h1 className="text-2xl font-extrabold">
            Create your account
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Join Verde and start earning rewards today.
          </p>
        </div>

        <form
          className="mt-6 flex-1 space-y-4"
          onSubmit={handleRegister}
        >

          <input
            required
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-12 w-full rounded-2xl border border-border bg-muted/40 px-4"
          />

          <input
            type="tel"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-12 w-full rounded-2xl border border-border bg-muted/40 px-4"
          />

          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-2xl border border-border bg-muted/40 px-4"
          />

          <input
            required
            placeholder="Building Name"
            value={buildingName}
            onChange={(e) => setBuildingName(e.target.value)}
            className="h-12 w-full rounded-2xl border border-border bg-muted/40 px-4"
          />

          <input
            placeholder="House Number"
            value={houseNumber}
            onChange={(e) => setHouseNumber(e.target.value)}
            className="h-12 w-full rounded-2xl border border-border bg-muted/40 px-4"
          />

          <input
            required
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-2xl border border-border bg-muted/40 px-4"
          />

          <input
            required
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 w-full rounded-2xl border border-border bg-muted/40 px-4"
          />

          <input
            placeholder="Referral Code (optional)"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            className="h-12 w-full rounded-2xl border border-border bg-muted/40 px-4"
          />

          <input
            placeholder="Invitation Code (optional)"
            value={invitationCode}
            onChange={(e) => setInvitationCode(e.target.value)}
            className="h-12 w-full rounded-2xl border border-border bg-muted/40 px-4"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-4 h-13 w-full rounded-2xl bg-gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-soft"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <p className="pt-2 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-primary"
            >
              Sign in
            </Link>
          </p>

        </form>

      </div>
    </MobileFrame>
  );
}