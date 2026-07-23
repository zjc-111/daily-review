import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  HomeIcon,
  PenSquareIcon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  CalendarIcon,
  ListIcon,
  LogOutIcon,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "首页", path: "/", icon: HomeIcon },
  { label: "每日", path: "/daily", icon: PenSquareIcon },
  { label: "每周", path: "/weekly", icon: CalendarDaysIcon },
  { label: "每月", path: "/monthly", icon: CalendarRangeIcon },
  { label: "每年", path: "/yearly", icon: CalendarIcon },
  { label: "全部", path: "/records", icon: ListIcon },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute top-1/3 -left-24 w-80 h-80 rounded-full bg-primary/[0.02] blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 rounded-full bg-warning/[0.02] blur-3xl" />
      </div>

      {/* Desktop Topbar (>=768px) */}
      <header className="hidden md:block sticky top-0 z-50 glass-nav border-b border-border/50">
        <div className="max-w-3xl mx-auto px-6 md:px-8">
          <div className="flex items-center justify-between h-14">
            <NavLink to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                <span className="text-primary-foreground text-xs font-black tracking-tight">R</span>
              </div>
              <span className="font-bold text-foreground tracking-tight text-[15px]">
                Daily Review
              </span>
            </NavLink>

            <nav className="flex items-center gap-0.5">
              {navItems.map((item) => {
                const isActive =
                  item.path === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "text-primary bg-accent shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    )}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <UserProfile />
          </div>
        </div>
      </header>

      {/* Mobile Header (<768px) */}
      <header className="md:hidden sticky top-0 z-50 glass-nav border-b border-border/50">
        <div className="px-4">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                <span className="text-primary-foreground text-[10px] font-black">R</span>
              </div>
              <span className="font-bold text-foreground tracking-tight text-sm">
                Daily Review
              </span>
            </div>
            <MobileUserAvatar />
          </div>
        </div>
      </header>

      {/* Main content -- extra bottom padding on mobile for tab bar */}
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-10 pb-24 md:pb-10">
        <Outlet />
      </main>

      {/* Mobile Bottom Tab Bar (<768px) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-nav border-t border-border/50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch justify-around h-16 px-1">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[56px] rounded-xl transition-colors active:scale-[0.97]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground active:bg-muted/50"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    isActive ? "stroke-[2.5px]" : "stroke-[1.5px]"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] leading-tight",
                    isActive ? "font-semibold" : "font-medium"
                  )}
                >
                  {item.label}
                </span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-primary -mt-0.5" />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function UserProfile() {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  if (!user) return null;

  const name = user.name || user.phone;
  const initial = name.charAt(0);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 pl-3 border-l border-border hover:bg-muted/70 rounded-xl px-2 py-1 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
          <span className="text-primary text-xs font-bold">{initial}</span>
        </div>
        <span className="text-sm font-medium text-foreground max-w-[80px] truncate">
          {name}
        </span>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg p-1 min-w-[140px]">
            <button
              onClick={() => { setShowMenu(false); logout(); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
            >
              <LogOutIcon className="w-4 h-4 text-muted-foreground" />
              退出登录
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MobileUserAvatar() {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  if (!user) return null;

  const name = user.name || user.phone;
  const initial = name.charAt(0);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-1.5 rounded-xl hover:bg-muted/70 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
          <span className="text-primary text-xs font-bold">{initial}</span>
        </div>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg p-1 min-w-[140px]">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium text-foreground truncate">{name}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{user.phone}</p>
            </div>
            <button
              onClick={() => { setShowMenu(false); logout(); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
            >
              <LogOutIcon className="w-4 h-4 text-muted-foreground" />
              退出登录
            </button>
          </div>
        </>
      )}
    </div>
  );
}
