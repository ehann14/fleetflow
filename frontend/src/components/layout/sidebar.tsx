'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Package, 
  Map, 
  Wrench, 
  Fuel, 
  Bell,
  LogOut,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'dispatcher', 'driver', 'manager'] },
  { name: 'Vehicles', href: '/vehicles', icon: Truck, roles: ['admin', 'dispatcher', 'manager'] },
  { name: 'Drivers', href: '/drivers', icon: Users, roles: ['admin', 'dispatcher', 'manager'] },
  { name: 'Deliveries', href: '/deliveries', icon: Package, roles: ['admin', 'dispatcher', 'driver', 'manager'] },
  { name: 'Tracking', href: '/tracking', icon: Map, roles: ['admin', 'dispatcher', 'manager'] },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench, roles: ['admin', 'dispatcher', 'manager'] },
  { name: 'Fuel', href: '/fuel', icon: Fuel, roles: ['admin', 'dispatcher', 'manager'] },
  { name: 'Audit Logs', href: '/audit-logs', icon: FileText, roles: ['admin'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <div className="flex h-full flex-col gap-y-5 bg-gray-900 px-6">
      <div className="flex h-16 shrink-0 items-center">
        <h1 className="text-2xl font-bold text-white">FleetFlow</h1>
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold',
                        isActive
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      )}
                    >
                      <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
          <li className="mt-auto">
            <button
              onClick={() => logout()}
              className="group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <LogOut className="h-6 w-6 shrink-0" aria-hidden="true" />
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}