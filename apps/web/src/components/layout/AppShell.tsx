"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ChefHat,
  ClipboardCheck,
  ClipboardList,
  Heart,
  Home,
  LogIn,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  UserPlus,
  UserRound
} from "lucide-react";
import type { UserProfile } from "@/types/domain";

const privateNav = [
  { href: "/dashboard", label: "Tableau de bord", icon: Home },
  { href: "/inventory", label: "Inventaire", icon: Package },
  { href: "/recipes", label: "Bibliotheque", icon: BookOpen },
  { href: "/recipes/suggestions", label: "Suggestions", icon: ClipboardCheck },
  { href: "/meal-plans", label: "Planning repas", icon: CalendarDays },
  { href: "/shopping-list", label: "Courses semaine", icon: ShoppingCart },
  { href: "/shopping-lists", label: "Courses recettes", icon: ClipboardList },
  { href: "/my-recipes", label: "Mes recettes", icon: Heart },
  { href: "/profile", label: "Profil", icon: UserRound },
  { href: "/settings", label: "Parametres", icon: Settings }
];

const publicNav = [
  { href: "/login", label: "Connexion", icon: LogIn },
  { href: "/register", label: "Inscription", icon: UserPlus }
];

type AppShellProps = {
  children: React.ReactNode;
  isCheckingSession: boolean;
  onLogout: () => void;
  user: UserProfile | null;
};

function getUserInitials(user: UserProfile) {
  return `${user.firstname?.[0] || ""}${user.lastname?.[0] || ""}`.toUpperCase() || user.email[0]?.toUpperCase() || "U";
}

export function AppShell({ children, isCheckingSession, onLogout, user }: AppShellProps) {
  const pathname = usePathname();
  const nav = user ? privateNav : publicNav;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href={user ? "/dashboard" : "/login"}>
          <span className="brand-mark"><ChefHat size={24} /></span>
          <span>
            <strong>Mealizy</strong>
            <small>Mes repas, ma semaine</small>
          </span>
        </Link>

        <nav className="nav-list" aria-label="Navigation principale">
          {nav.map((item) => (
            <Link key={item.href} className={pathname === item.href ? "nav-item active" : "nav-item"} href={item.href}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
          {user && (
            <button className="nav-item nav-button" type="button" onClick={onLogout}>
              <LogOut size={20} />
              <span>Deconnexion</span>
            </button>
          )}
        </nav>

        {user && (
          <div className="user-card">
            <div className="user-avatar" aria-hidden="true">{getUserInitials(user)}</div>
            <span>
              <strong>{user.firstname} {user.lastname}</strong>
              <small>{user.email}</small>
            </span>
          </div>
        )}
      </aside>
      <div className="content">{isCheckingSession ? null : children}</div>
    </div>
  );
}
