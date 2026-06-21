'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  Car,
  ClipboardList,
  Package,
  Boxes,
  ShoppingCart,
  Wallet,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type AppRole = 'OWNER' | 'ADMIN' | 'STAFF';

const navItems = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/suppliers', label: 'Fornecedores', icon: Building2, roles: ['OWNER', 'ADMIN'] as AppRole[] },
  { href: '/vehicles', label: 'Veículos', icon: Car },
  { href: '/service-orders', label: 'Ordens de Serviço', icon: ClipboardList },
  { href: '/products', label: 'Peças e Serviços', icon: Package },
  { href: '/inventory', label: 'Estoque', icon: Boxes },
  { href: '/purchases', label: 'Compras', icon: ShoppingCart, roles: ['OWNER', 'ADMIN'] as AppRole[] },
  { href: '/finance', label: 'Financeiro', icon: Wallet, roles: ['OWNER', 'ADMIN'] as AppRole[] },
  { href: '/settings', label: 'Configurações', icon: Settings, roles: ['OWNER', 'ADMIN'] as AppRole[] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex items-center gap-2 p-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          GM
        </div>
        <span className="text-lg font-bold">Opero</span>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 p-4">
        {navItems
          .filter((item) => {
            if (!item.roles) return true;
            return item.roles.includes((user?.role as AppRole) ?? 'STAFF');
          })
          .map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
          })}
      </nav>

      <Separator />

      <div className="p-4">
        <div className="mb-2 text-xs text-muted-foreground">
          {user?.name ?? user?.email}
        </div>
        <div className="mb-3 text-xs text-muted-foreground">
          {user?.role}
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
