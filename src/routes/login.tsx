import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ShoppingBag } from "lucide-react";
import { MobileFrame } from "@/components/MobileFrame";
import { useAppState } from "@/lib/app-state";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const navigate = useNavigate();
  const { login } = useAppState();

  return (
    <MobileFrame>
      <div className="flex min-h-screen flex-col md:min-h-[820px]">
        <div className="relative overflow-hidden bg-gradient-hero px-6 pb-10 pt-14 text-primary-foreground">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold">Welcome back</h1>
          <p className="mt-1 text-sm text-white/85">Sign in to keep shopping.</p>
        </div>

        <form
          className="-mt-6 flex-1 rounded-t-3xl bg-card p-6 shadow-card"
          onSubmit={(e) => {
            e.preventDefault();
            login();
            navigate({ to: "/home" });
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Email or phone
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  required
                  defaultValue="amina@verde.app"
                  className="h-13 w-full rounded-2xl border border-border bg-muted/40 pl-11 pr-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:bg-card"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  defaultValue="password"
                  className="h-13 w-full rounded-2xl border border-border bg-muted/40 pl-11 pr-11 py-3 text-sm outline-none transition-colors focus:border-primary focus:bg-card"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 accent-[oklch(0.62_0.17_152)]"
                />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <button type="button" className="font-medium text-primary">
                Forgot password?
              </button>
            </div>
            <button
              type="submit"
              className="mt-4 h-13 w-full rounded-2xl bg-gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-soft transition-transform active:scale-[0.98]"
            >
              Sign in
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-primary">
              Create Account
            </Link>
          </p>
        </form>
      </div>
    </MobileFrame>
  );
}
