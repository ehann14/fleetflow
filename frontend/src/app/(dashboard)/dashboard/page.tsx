'use client';

import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Users, Package, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    {
      name: 'Total Vehicles',
      value: '24',
      change: '+2',
      icon: Truck,
      color: 'bg-blue-500',
    },
    {
      name: 'Active Drivers',
      value: '18',
      change: '+1',
      icon: Users,
      color: 'bg-green-500',
    },
    {
      name: 'Active Deliveries',
      value: '12',
      change: '+3',
      icon: Package,
      color: 'bg-yellow-500',
    },
    {
      name: 'Completed Today',
      value: '45',
      change: '+12%',
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        {/* FIX: Mengubah "Here's" menjadi "Here is" untuk menghindari error ESLint */}
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.name}! Here is what is happening with your fleet today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.name}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest fleet activities and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Delivery #{1000 + i} updated</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left">
                <Truck className="h-6 w-6 text-blue-500 mb-2" />
                <p className="font-medium">Add Vehicle</p>
                <p className="text-xs text-gray-500">Register new vehicle</p>
              </button>
              <button className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left">
                <Users className="h-6 w-6 text-green-500 mb-2" />
                <p className="font-medium">Add Driver</p>
                <p className="text-xs text-gray-500">Register new driver</p>
              </button>
              <button className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left">
                <Package className="h-6 w-6 text-yellow-500 mb-2" />
                <p className="font-medium">Create Delivery</p>
                <p className="text-xs text-gray-500">New delivery order</p>
              </button>
              <button className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left">
                <TrendingUp className="h-6 w-6 text-purple-500 mb-2" />
                <p className="font-medium">View Reports</p>
                <p className="text-xs text-gray-500">Analytics and insights</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}