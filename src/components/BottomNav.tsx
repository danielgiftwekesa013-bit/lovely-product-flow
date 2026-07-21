import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, ShoppingBag, Heart, User } from "lucide-react";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/cart", label: "Cart", icon: ShoppingBag },
  { to: "/favorites", label: "Saved", icon: Heart },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="sticky bottom-0 z-30 border-t border-border/60 bg-card/95 backdrop-blur-lg">
      <div className="mx-auto grid max-w-md grid-cols-5 px-2 py-2">
        {tabs.map((t) => {
          const active = pathname === t.to || (t.to === "/home" && pathname === "/");
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className="flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-all"
            >
              <div
                className={`grid h-9 w-9 place-items-center rounded-xl transition-all ${
                  active ? "bg-gradient-primary text-primary-foreground shadow-soft scale-105" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 2} />
              </div>
              <span
                className={`text-[10px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
