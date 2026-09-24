<?php

namespace App\Database\Seeds;

use App\Models\VehicleLocationModel;
use CodeIgniter\Database\Seeder;

/**
 * Data uji GPS untuk Milestone 7.
 * Membuat jejak 10 titik (selang 30 detik, berakhir "sekarang") di sekitar Bandung
 * untuk setiap kendaraan yang sedang punya delivery aktif (assigned/pickup/on_delivery).
 *
 * Jalankan: php spark db:seed TrackingSeeder
 */
class TrackingSeeder extends Seeder
{
    public function run()
    {
        $vehicles = $this->db->table('deliveries')
            ->select('vehicle_id, MAX(driver_id) AS driver_id')
            ->whereIn('status', ['assigned', 'pickup', 'on_delivery'])
            ->where('vehicle_id IS NOT NULL', null, false)
            ->groupBy('vehicle_id')
            ->get()
            ->getResultArray();

        if (empty($vehicles)) {
            echo "Tidak ada delivery aktif dengan kendaraan. Assign delivery dulu.\n";
            return;
        }

        $model   = new VehicleLocationModel();
        $baseLat = -6.9175;
        $baseLng = 107.6191;
        $points  = 10;

        foreach ($vehicles as $k => $v) {
            for ($i = 0; $i < $points; $i++) {
                $model->record([
                    'vehicle_id'  => (int) $v['vehicle_id'],
                    'driver_id'   => $v['driver_id'] !== null ? (int) $v['driver_id'] : null,
                    'latitude'    => round($baseLat + ($k * 0.010) + ($i * 0.0006), 7),
                    'longitude'   => round($baseLng + ($k * 0.008) + ($i * 0.0009), 7),
                    'speed'       => 25 + (($i * 3) % 20),
                    'recorded_at' => date('Y-m-d H:i:s', time() - (($points - 1 - $i) * 30)),
                ]);
            }
        }

        echo 'Selesai: ' . count($vehicles) . " kendaraan x {$points} titik.\n";
    }
}