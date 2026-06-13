import { CreditCard, LayoutDashboard, Palette, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Brand", href: "/brand", icon: Palette },
  { label: "Billing", href: "/billing", icon: CreditCard },
];
