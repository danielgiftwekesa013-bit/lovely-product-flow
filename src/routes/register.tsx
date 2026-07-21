import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { MobileFrame } from "@/components/MobileFrame";
import { useAppState } from "@/lib/app-state";

export const Route = createFileRoute("/register")({
  component: Register,
});

function Field({ label, type = "text", placeholder }: { label: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-card"
      />
    </div>
  );
}

function Register() {
  const navigate = useNavigate();
  const { login } = useAppState();
  return (
    <MobileFrame>
      <div className="flex min-h-screen flex-col px-6 py-8 md:min-h-[820px]">
        <Link to="/login" className="grid h-10 w-10 place-items-center rounded-full bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="mt-6">
          <h1 className="text-2xl font-extrabold">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Join Verde and start earning rewards today.
          </p>
        </div>
        <form
          className="mt-6 flex-1 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            login();
            navigate({ to: "/home" });
          }}
        >
          <Field label="Full name" placeholder="Amina Njeri" />
          <Field label="Phone number" type="tel" placeholder="+254 712 000 000" />
          <Field label="Email" type="email" placeholder="you@example.com" />
          <Field label="Password" type="password" placeholder="••••••••" />
          <Field label="Confirm password" type="password" placeholder="••••••••" />
          <Field label="Referral code (optional)" placeholder="VERDE-1234" />

          <button
            type="submit"
            className="mt-4 h-13 w-full rounded-2xl bg-gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-soft"
          >
            Create Account
          </button>
          <p className="pt-2 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </MobileFrame>
  );
}
