<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use Config\Database;

class DashboardController extends BaseController
{
    protected $format = 'json';

    public function stats()
    {
        $db = Database::connect();

        try {
            // Total Vehicles
            $totalVehicles = $db->table('vehicles')->countAllResults();

            // Active Drivers
            $activeDrivers = $db->table('drivers')
                                ->where('status', 'active')
                                ->countAllResults();

            // Active Deliveries
            $activeDeliveries = $db->table('deliveries')
                                   ->groupStart()
                                       ->where('status', 'on_delivery')
                                       ->orWhere('status', 'pending')
                                   ->groupEnd()
                                   ->countAllResults();

            // Completed Today
            $today = date('Y-m-d');
            $completedToday = $db->table('deliveries')
                                 ->where('status', 'delivered')
                                 ->where('DATE(created_at)', $today)
                                 ->countAllResults();

            return $this->response->setJSON([
                'success' => true,
                'message' => 'Dashboard stats retrieved successfully',
                'data'    => [
                    'total_vehicles'    => (int) $totalVehicles,
                    'active_drivers'    => (int) $activeDrivers,
                    'active_deliveries' => (int) $activeDeliveries,
                    'completed_today'   => (int) $completedToday,
                ]
            ]);

        } catch (\Exception $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'success' => false,
                'message' => 'Gagal mengambil data dashboard: ' . $e->getMessage(),
            ]);
        }
    }
}