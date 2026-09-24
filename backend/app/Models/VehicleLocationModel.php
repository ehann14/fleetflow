<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Riwayat titik GPS (tabel vehicle_locations) + lokasi terakhir per kendaraan
 * (tabel vehicle_last_locations).
 */
class VehicleLocationModel extends Model
{
    protected $table            = 'vehicle_locations';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'vehicle_id', 'driver_id', 'latitude', 'longitude', 'speed', 'recorded_at',
    ];

    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = '';

    /** Status delivery yang dianggap "sedang berjalan". */
    private const ACTIVE_DELIVERY_STATUSES = "'assigned','pickup','on_delivery'";

    /**
     * Simpan 1 titik GPS:
     *  - selalu ditambahkan ke riwayat (vehicle_locations)
     *  - lokasi terakhir (vehicle_last_locations) hanya diganti kalau titik ini
     *    tidak lebih lama dari yang sudah tersimpan (aman untuk data yang datang terlambat / tidak berurutan)
     *
     * @param array{vehicle_id:int,driver_id:?int,latitude:float,longitude:float,speed:float,recorded_at:string} $point
     *
     * @return int ID baris riwayat, atau 0 bila gagal
     */
    public function record(array $point): int
    {
        $now = date('Y-m-d H:i:s');

        $this->db->transStart();

        $this->db->table('vehicle_locations')->insert($point + ['created_at' => $now]);
        $historyId = (int) $this->db->insertID();

        // Coba insert dulu (kendaraan belum pernah kirim lokasi). INSERT IGNORE aman terhadap race condition.
        $this->db->table('vehicle_last_locations')->ignore(true)->insert($point + ['updated_at' => $now]);

        if ($this->db->affectedRows() === 0) {
            // Baris sudah ada -> update hanya jika titik baru tidak lebih lama.
            $this->db->table('vehicle_last_locations')
                ->where('vehicle_id', $point['vehicle_id'])
                ->where('recorded_at <=', $point['recorded_at'])
                ->update([
                    'driver_id'   => $point['driver_id'],
                    'latitude'    => $point['latitude'],
                    'longitude'   => $point['longitude'],
                    'speed'       => $point['speed'],
                    'recorded_at' => $point['recorded_at'],
                    'updated_at'  => $now,
                ]);
        }

        $this->db->transComplete();

        return $this->db->transStatus() ? $historyId : 0;
    }

    /**
     * Query dasar "posisi terkini kendaraan":
     * vehicles + lokasi terakhir + driver + delivery aktif (maksimal 1 baris per kendaraan).
     *
     * Bila kendaraan punya lebih dari satu delivery aktif, yang diambil berurutan:
     * on_delivery > pickup > assigned, lalu id terbaru.
     */
    private function currentQuery()
    {
        $active = self::ACTIVE_DELIVERY_STATUSES;

        return $this->db->table('vehicles v')
            ->select(
                'v.id AS vehicle_id, v.vehicle_code, v.plate_number, v.brand, v.model, v.status AS vehicle_status, '
                . 'dr.id AS driver_id, dr.name AS driver_name, dr.phone AS driver_phone, '
                . 'l.latitude, l.longitude, l.speed, l.recorded_at, '
                . 'd.id AS delivery_id, d.order_number, d.status AS delivery_status, '
                . 'd.customer_name, d.destination_address'
            )
            ->join('vehicle_last_locations l', 'l.vehicle_id = v.id', 'left')
            ->join(
                'deliveries d',
                "d.id = (SELECT d2.id FROM deliveries d2 WHERE d2.vehicle_id = v.id AND d2.status IN ({$active}) "
                . "ORDER BY FIELD(d2.status, 'on_delivery', 'pickup', 'assigned'), d2.id DESC LIMIT 1)",
                'left',
                false
            )
            ->join('drivers dr', 'dr.id = COALESCE(l.driver_id, d.driver_id)', 'left', false);
    }

    /**
     * Daftar posisi terkini semua kendaraan yang PERNAH mengirim lokasi.
     *
     * @param string      $search        cari di plat / kode kendaraan / nama driver
     * @param string      $vehicleStatus filter status kendaraan
     * @param string|null $onlineSince   bila diisi (Y-m-d H:i:s) hanya kendaraan dengan titik >= waktu ini
     */
    public function findCurrent(string $search = '', string $vehicleStatus = '', ?string $onlineSince = null): array
    {
        $builder = $this->currentQuery()->where('l.vehicle_id IS NOT NULL', null, false);

        if ($search !== '') {
            $builder->groupStart()
                ->like('v.plate_number', $search)
                ->orLike('v.vehicle_code', $search)
                ->orLike('dr.name', $search)
                ->groupEnd();
        }

        if ($vehicleStatus !== '') {
            $builder->where('v.status', $vehicleStatus);
        }

        if ($onlineSince !== null) {
            $builder->where('l.recorded_at >=', $onlineSince);
        }

        return $builder->orderBy('l.recorded_at', 'DESC')->get()->getResultArray();
    }

    /**
     * Posisi terkini 1 kendaraan. Mengembalikan null bila kendaraan tidak ada.
     * Bila kendaraan ada tapi belum pernah kirim lokasi, field lokasi bernilai null.
     */
    public function findCurrentByVehicle(int $vehicleId): ?array
    {
        $row = $this->currentQuery()->where('v.id', $vehicleId)->get()->getRowArray();

        return $row ?: null;
    }

    /**
     * Riwayat titik GPS satu kendaraan: N titik TERBARU, dikembalikan urut lama -> baru
     * (siap dipakai sebagai polyline).
     */
    public function history(int $vehicleId, int $limit = 100, ?string $from = null, ?string $to = null): array
    {
        $builder = $this->db->table('vehicle_locations')
            ->select('id, driver_id, latitude, longitude, speed, recorded_at')
            ->where('vehicle_id', $vehicleId);

        if ($from !== null) {
            $builder->where('recorded_at >=', $from);
        }
        if ($to !== null) {
            $builder->where('recorded_at <=', $to);
        }

        $rows = $builder->orderBy('recorded_at', 'DESC')
            ->orderBy('id', 'DESC')
            ->limit($limit)
            ->get()
            ->getResultArray();

        return array_reverse($rows);
    }
}