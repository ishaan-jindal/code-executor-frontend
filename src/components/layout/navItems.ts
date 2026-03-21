export interface NavItem {
  label: string;
  href: string;
  adminOnly?: boolean;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Playground", href: "/playground" },
  { label: "Job history", href: "/jobs" },
  { label: "API keys", href: "/keys" },
  { label: "Webhooks", href: "/webhooks" },
  { label: "Settings", href: "/settings" },
  { label: "Admin panel", href: "/admin", adminOnly: true },
];