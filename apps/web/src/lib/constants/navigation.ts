import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Warehouse,
  Scale,
  Users,
  Settings,
  FileText,
  Wallet,
} from 'lucide-react';
import type { Role } from '@/types';

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

/** Post-login and “home” link in sidebar for each role */
export function defaultHomePath(role: Role): string {
  return role === 'SALES' ? '/sales' : '/dashboard';
}

const ALL_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['MANAGER', 'CASHIER'] },
  { href: '/sales', label: 'Sell Drinks', icon: TrendingUp, roles: ['MANAGER', 'CASHIER', 'SALES'] },
  { href: '/purchases', label: 'Buy Stock', icon: ShoppingCart, roles: ['MANAGER', 'CASHIER'] },
  { href: '/inventory', label: 'Stock Status', icon: Warehouse, roles: ['MANAGER', 'CASHIER'] },
  { href: '/reports', label: 'Reports', icon: FileText, roles: ['MANAGER', 'CASHIER'] },
  { href: '/expenditures', label: 'Expenditures', icon: Wallet, roles: ['MANAGER', 'CASHIER'] },
  { href: '/products', label: 'Products', icon: Package, roles: ['MANAGER', 'CASHIER'] },
  { href: '/adjustments', label: 'Stock Corrections', icon: Scale, roles: ['MANAGER', 'CASHIER'] },
  { href: '/users', label: 'Users', icon: Users, roles: ['MANAGER'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['MANAGER', 'CASHIER'] },
];

const ORDER = [
  '/dashboard',
  '/sales',
  '/purchases',
  '/inventory',
  '/reports',
  '/expenditures',
  '/products',
  '/adjustments',
  '/users',
  '/settings',
];

export const navItems: NavItem[] = ORDER.map(
  (href) => ALL_NAV.find((i) => i.href === href)
).filter(Boolean) as NavItem[];

/** Paths visible in the sidebar for the given role */
export function navItemsForRole(role: Role): NavItem[] {
  return navItems.filter((item) => item.roles.includes(role));
}

/** Path to display label for header (includes all routes) */
export const pathLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/sales': 'Sell Drinks',
  '/purchases': 'Buy Stock',
  '/inventory': 'Stock Status',
  '/reports': 'Reports',
  '/expenditures': 'Expenditures',
  '/products': 'Products',
  '/adjustments': 'Stock Corrections',
  '/users': 'Users',
  '/settings': 'Settings',
};
