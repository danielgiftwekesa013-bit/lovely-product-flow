import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { MobileFrame } from "./MobileFrame";
import { BottomNav } from "./BottomNav";

type Props = {
  children: ReactNode;
  title?: string;
  back?: string;
  showNav?: boolean;
  right?: ReactNode;
  bare?: boolean;
};

export function AppShell({ children, title, back, showNav = true, right, bare }: Props) {
  if (bare) {
    return <MobileFrame>{children}</MobileFrame>;
  }
  return (
    <MobileFrame>
      <div className="flex min-h-screen flex-col md:min-h-[820px]">
        {title && (
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/40 bg-card/95 px-4 py-3 backdrop-blur-lg">
            <div className="flex min-w-0 items-center gap-2">
              {back && (
                <Link
                  to={back}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted transition-colors hover:bg-accent"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              )}
              <h1 className="truncate text-base font-semibold">{title}</h1>
            </div>
            {right}
          </header>
        )}
        <main className="flex-1 overflow-y-auto pb-4">{children}</main>
        {showNav && <BottomNav />}
      </div>
    </MobileFrame>
  );
}
