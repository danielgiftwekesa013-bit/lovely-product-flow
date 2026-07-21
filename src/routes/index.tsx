import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShoppingBag } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { MobileFrame } from "@/components/MobileFrame";

export const Route = createFileRoute("/")({
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  const { state, hydrated } = useAppState();

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      if (!state.onboarded) navigate({ to: "/onboarding" });
      else if (!state.authed) navigate({ to: "/login" });
      else navigate({ to: "/home" });
    }, 1800);
    return () => clearTimeout(t);
  }, [hydrated, state.onboarded, state.authed, navigate]);

  return (
    <MobileFrame>
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-hero text-primary-foreground md:min-h-[820px]">
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pop-in relative z-10 flex flex-col items-center gap-5">
          <div className="grid h-24 w-24 place-items-center rounded-[28px] bg-white/20 backdrop-blur-xl shadow-elegant">
            <ShoppingBag className="h-11 w-11" strokeWidth={2.2} />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight">Verde</h1>
            <p className="mt-1 text-sm text-white/85">Shop the finer things.</p>
          </div>
        </div>
        <div className="absolute bottom-14 z-10 flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-white/70"
              style={{ animation: `pop-in 0.6s ${i * 0.15}s both, float-slow 1.6s ${i * 0.15}s infinite` }}
            />
          ))}
        </div>
      </div>
    </MobileFrame>
  );
}
