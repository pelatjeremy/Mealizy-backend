import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ChefHat,
  ClipboardCheck,
  Heart,
  Home,
  Package,
  Settings,
  ShoppingCart,
  UserRound
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Tableau de bord", icon: Home },
  { href: "/inventory", label: "Inventaire", icon: Package },
  { href: "/recipes", label: "Recettes", icon: BookOpen },
  { href: "/recipes/suggestions", label: "Suggestions", icon: ClipboardCheck },
  { href: "/meal-plans", label: "Planning repas", icon: CalendarDays },
  { href: "/shopping-list", label: "Liste de courses", icon: ShoppingCart },
  { href: "/my-recipes", label: "Mes recettes", icon: Heart },
  { href: "/profile", label: "Profil", icon: UserRound },
  { href: "/settings", label: "Paramètres", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark"><ChefHat size={24} /></span>
          <span>
            <strong>Mealizy</strong>
            <small>Mes repas, ma semaine</small>
          </span>
        </Link>

        <nav className="nav-list" aria-label="Navigation principale">
          {nav.map((item) => (
            <Link key={item.href} className="nav-item" href={item.href}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="user-card">
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80" alt="" />
          <span>
            <strong>Sophie Dupont</strong>
            <small>sophie@mail.com</small>
          </span>
        </div>
      </aside>
      <div className="content">{children}</div>
    </div>
  );
}
