import Link from "next/link";
import { ChevronRight, LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  tone: "green" | "orange" | "purple" | "blue";
  label: string;
  value: string;
  helper: string;
  href: string;
  cta: string;
};

export function StatCard({ icon: Icon, tone, label, value, helper, href, cta }: Props) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={30} />
      </div>
      <div>
        <p className={`stat-label ${tone}`}>{label}</p>
        <strong>{value}</strong>
        <span>{helper}</span>
      </div>
      <Link href={href} className={`stat-link ${tone}`}>
        {cta}
        <ChevronRight size={17} />
      </Link>
    </article>
  );
}
