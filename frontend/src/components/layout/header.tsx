'use client';

import { useAuth } from '@/context/AuthContext';
import { Bell, User } from 'lucide-react';

export default function Header() {
  const { user } = useAuth();

  if (!user) return null;

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: 'bg-red-100 text-red-800',
      dispatcher: 'bg-blue-100 text-blue-800',
      driver: 'bg-green-100 text-green-800',
      manager: 'bg-purple-100 text-purple-800',
    };
    return badges[role as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1 items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Welcome back, {user.name}
          </h2>
        </div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <button className="relative p-1 text-gray-400 hover:text-gray-500">
            <Bell className="h-6 w-6" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>
          <div className="h-6 w-px bg-gray-200" aria-hidden="true" />
          <div className="flex items-center gap-x-4">
            <div className="flex items-center gap-x-2">
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">{user.name}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadge(user.role)}`}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}