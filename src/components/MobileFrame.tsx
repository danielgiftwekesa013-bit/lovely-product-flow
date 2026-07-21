import type { ReactNode } from "react";

/** Wraps every screen in a phone-shaped frame on desktop, full-screen on mobile. */
export function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-soft md:bg-[radial-gradient(circle_at_top,oklch(0.94_0.06_150),oklch(0.98_0.01_150))] md:py-8">
      <div className="mx-auto min-h-screen w-full max-w-md bg-background md:min-h-[820px] md:rounded-[36px] md:shadow-elegant md:overflow-hidden md:border md:border-border/60 relative">
        {children}
      </div>
    </div>
  );
}
