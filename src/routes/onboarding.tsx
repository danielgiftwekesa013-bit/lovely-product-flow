import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingBag, ShieldCheck, Gift, Users, Truck } from "lucide-react";
import { MobileFrame } from "@/components/MobileFrame";
import { useAppState } from "@/lib/app-state";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const slides = [
  {
    icon: ShoppingBag,
    title: "Shop anytime, anywhere",
    body: "Quality products, hand-picked and delivered right to your door.",
    tint: "from-primary/20 to-primary-glow/30",
  },
  {
    icon: ShieldCheck,
    title: "Fast &secure M-Pesa checkout",
    body: "Pay in a tap with the most trusted mobile wallet in Kenya.",
    tint: "from-emerald-200/60 to-primary/20",
  },
  {
    icon: Gift,
    title: "Earn loyalty rewards",
    body: "Every purchase earns you points to redeem on future orders.",
    tint: "from-primary-glow/30 to-primary/10",
  },
  {
    icon: Users,
    title: "Invite & get rewarded",
    body: "Share your code with friends and earn on every referral.",
    tint: "from-lime-200/60 to-primary/20",
  },
  
];

function Onboarding() {
  const [i, setI] = useState(0);
  const navigate = useNavigate();
  const { setOnboarded } = useAppState();

  const isLast = i === slides.length - 1;
  const finish = () => {
    setOnboarded(true);
    navigate({ to: "/login" });
  };
  const Slide = slides[i];
  const Icon = Slide.icon;

  return (
    <MobileFrame>
      <div className="flex min-h-screen flex-col justify-between px-6 py-8 md:min-h-[820px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <span className="font-bold">PlugNplay</span>
          </div>
          <button
            className="text-sm font-medium text-muted-foreground"
            onClick={finish}
          >
            Skip
          </button>
        </div>

        <div key={i} className="pop-in flex flex-1 flex-col items-center justify-center py-6">
          <div className={`mb-8 grid h-56 w-56 place-items-center rounded-full bg-gradient-to-br ${Slide.tint} shadow-soft`}>
            <div className="grid h-32 w-32 place-items-center rounded-full bg-card shadow-float float-slow">
              <Icon className="h-14 w-14 text-primary" strokeWidth={1.8} />
            </div>
          </div>
          <h2 className="text-center text-2xl font-extrabold tracking-tight">{Slide.title}</h2>
          <p className="mt-3 max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
            {Slide.body}
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-center gap-2">
            {slides.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-8 bg-primary" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {i > 0 && (
              <button
                onClick={() => setI(i - 1)}
                className="h-12 flex-1 rounded-2xl border border-border font-semibold"
              >
                Back
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setI(i + 1))}
              className="h-12 flex-[2] rounded-2xl bg-gradient-primary font-semibold text-primary-foreground shadow-soft transition-transform active:scale-[0.98]"
            >
              {isLast ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}
