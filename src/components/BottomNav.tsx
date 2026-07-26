import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, ShoppingBag, User } from "lucide-react";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/cart", label: "Cart", icon: ShoppingBag },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="sticky bottom-0 z-30 border-t border-black/20 bg-gradient-to-r from-red-700 via-yellow-500 to-green-700 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-md items-center justify-between px-1 py-2 sm:px-3">
        {tabs.map((t, index) => {
          const active =
            pathname === t.to || (t.to === "/home" && pathname === "/");

          const Icon = t.icon;

          const inactiveColors = [
            "bg-red-700 text-white",
            "bg-yellow-500 text-black",
            "bg-green-700 text-white",
            "bg-red-700 text-white",
          ];

          return (
            <Link
              key={t.to}
              to={t.to}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition-all duration-300"
            >
              <div
                className={`grid h-10 w-10 place-items-center rounded-full transition-all duration-300 sm:h-11 sm:w-11 ${
                  active
                    ? "animate-[flicker_1.5s_ease-in-out_infinite] bg-green-500 text-white shadow-[0_0_8px_rgba(34,197,94,0.9),0_0_18px_rgba(34,197,94,0.7)] scale-110"
                    : `${inactiveColors[index]} shadow-md`
                }`}
              >
                <Icon
                  className="h-5 w-5 sm:h-[21px] sm:w-[21px]"
                  strokeWidth={active ? 2.6 : 2}
                />
              </div>

              <span
                className={`truncate text-[10px] font-semibold sm:text-xs ${
                  active
                    ? "text-green-950 drop-shadow-sm"
                    : "text-white drop-shadow-sm"
                }`}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>

      <style>{`
        @keyframes flicker {
          0%,
          100% {
            opacity: 1;
            filter: brightness(1);
          }

          25% {
            opacity: 0.8;
            filter: brightness(0.9);
          }

          50% {
            opacity: 1;
            filter: brightness(1.35);
          }

          75% {
            opacity: 0.9;
            filter: brightness(1.1);
          }
        }
      `}</style>
    </nav>
  );
}