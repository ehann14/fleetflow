<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Milestone 7 — GPS Tracking.
 *
 * Tabel:
 *  - vehicle_locations      : riwayat seluruh titik GPS (append-only)
 *  - vehicle_last_locations : lokasi terakhir, tepat 1 baris per kendaraan
 *
 * Method yang dipakai TrackingController & TrackingSeeder:
 *  record(), findCurrent(), findCurrentByVehicle(), history()
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
    protected $updatedField  = ''; // riwayat GPS tidak pernah diubah

    /** Status delivery yang dianggap "sedang berjalan" untuk kendaraan. */
    private const ACTIVE_DELIVERY_STATUSES = ['assigned', 'pickup', 'on_delivery'];

    /**
     * Simpan 1 titik GPS: tambah ke riwayat + perbarui lokasi terakhir kendaraan.
     * Keduanya dalam satu transaksi.
     *
     * @param array{vehicle_id:int, driver_id:?int, latitude:float, longitude:float, speed:float, recorded_at:string} $point
     *
     * @return int ID baris riwayat yang baru dibuat
     */
    public function record(array $point): int
    {
        $this->db->transBegin();

        try {
            $id = $this->insert($point);

            if ($id === false) {
                throw new \RuntimeException('Gagal menyimpan riwayat lokasi');
            }

            $this->upsertLastLocation($point);

            if ($this->db->transStatus() === false) {
                throw new \RuntimeException('Transaksi database gagal');
            }

            $this->db->transCommit();
        } catch (\Throwable $e) {
            $this->db->transRollback();

            throw $e;
        }

        return (int) $id;
    }

    /**
     * Posisi terkini semua kendaraan (termasuk yang belum pernah mengirim GPS:
     * latitude/longitude/timestamp = null).
     *
     * @param string      $search      cari di kode, plat, merk, model kendaraan, atau nama driver
     * @param string      $status      filter status kendaraan ('' = semua)
     * @param string|null $onlineSince hanya titik dengan recorded_at >= nilai ini (null = semua)
     *
     * @return list<array<string, mixed>>
     */
    public function findCurrent(string $search = '', string $status = '', ?string $onlineSince = null): array
    {
        $where  = [];
        $params = [];

        if ($search !== '') {
            $like    = '%' . $this->db->escapeLikeString($search) . '%';
            $where[] = '(v.vehicle_code LIKE ? ESCAPE \'!\''
                . ' OR v.plate_number LIKE ? ESCAPE \'!\''
                . ' OR v.brand LIKE ? ESCAPE \'!\''
                . ' OR v.model LIKE ? ESCAPE \'!\''
                . ' OR dr.name LIKE ? ESCAPE \'!\')';
            array_push($params, $like, $like, $like, $like, $like);
        }

        if ($status !== '') {
            $where[]  = 'v.status = ?';
            $params[] = $status;
        }

        if ($onlineSince !== null) {
            $where[]  = 'l.recorded_at >= ?';
            $params[] = $onlineSince;
        }

        $sql = $this->currentSelectSql()
            . ($where !== [] ? ' WHERE ' . implode(' AND ', $where) : '')
            . ' ORDER BY v.vehicle_code ASC';

        return $this->db->query($sql, $params)->getResultArray();
    }

    /**
     * Posisi terkini 1 kendaraan, atau null bila kendaraan tidak ada.
     *
     * @return array<string, mixed>|null
     */
    public function findCurrentByVehicle(int $vehicleId): ?array
    {
        $sql = $this->currentSelectSql() . ' WHERE v.id = ? LIMIT 1';

        return $this->db->query($sql, [$vehicleId])->getRowArray();
    }

    /**
     * Riwayat titik GPS kendaraan. Mengambil N titik TERBARU (opsional dibatasi from/to),
     * lalu mengembalikannya berurutan dari lama ke baru supaya langsung bisa dipakai sebagai polyline.
     *
     * @return list<array<string, mixed>>
     */
    public function history(int $vehicleId, int $limit = 100, ?string $from = null, ?string $to = null): array
    {
        $builder = $this->db->table($this->table)
            ->select('driver_id, latitude, longitude, speed, recorded_at')
            ->where('vehicle_id', $vehicleId);

        if ($from !== null) {
            $builder->where('recorded_at >=', $from);
        }

        if ($to !== null) {
            $builder->where('recorded_at <=', $to);
        }

        $rows = $builder
            ->orderBy('recorded_at', 'DESC')
            ->orderBy('id', 'DESC')
            ->limit($limit)
            ->get()
            ->getResultArray();

        return array_reverse($rows);
    }

    // ------------------------------------------------------------------
    // Helper
    // ------------------------------------------------------------------

    /**
     * Lokasi terakhir: 1 baris per kendaraan. Titik yang datang terlambat (recorded_at lebih lama
     * dari yang sudah tersimpan) tidak menimpa lokasi terakhir.
     * recorded_at sengaja diperbarui PALING AKHIR: MySQL mengevaluasi assignment dari kiri ke kanan,
     * jadi perbandingan di kolom lain masih memakai nilai recorded_at yang lama.
     */
    private function upsertLastLocation(array $p): void
    {
        $table = $this->db->prefixTable('vehicle_last_locations');

        $this->db->query(
            "INSERT INTO {$table}
                (vehicle_id, driver_id, latitude, longitude, speed, recorded_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                driver_id   = IF(VALUES(recorded_at) >= recorded_at, VALUES(driver_id), driver_id),
                latitude    = IF(VALUES(recorded_at) >= recorded_at, VALUES(latitude), latitude),
                longitude   = IF(VALUES(recorded_at) >= recorded_at, VALUES(longitude), longitude),
                speed       = IF(VALUES(recorded_at) >= recorded_at, VALUES(speed), speed),
                updated_at  = IF(VALUES(recorded_at) >= recorded_at, VALUES(updated_at), updated_at),
                recorded_at = IF(VALUES(recorded_at) >= recorded_at, VALUES(recorded_at), recorded_at)",
            [
                (int) $p['vehicle_id'],
                isset($p['driver_id']) ? (int) $p['driver_id'] : null,
                $p['latitude'],
                $p['longitude'],
                $p['speed'] ?? 0,
                $p['recorded_at'],
                date('Y-m-d H:i:s'),
            ]
        );
    }

    /**
     * SELECT dasar untuk posisi terkini (tanpa WHERE/ORDER BY).
     * Kolom hasil = yang dibaca TrackingController::formatItem().
     * Delivery yang ditampilkan = delivery aktif terbaru milik kendaraan tsb.
     */
    private function currentSelectSql(): string
    {
        $vehicles   = $this->db->prefixTable('vehicles');
        $lastLoc    = $this->db->prefixTable('vehicle_last_locations');
        $deliveries = $this->db->prefixTable('deliveries');
        $drivers    = $this->db->prefixTable('drivers');

        $active = "'" . implode("','", self::ACTIVE_DELIVERY_STATUSES) . "'";

        return "SELECT
                    v.id            AS vehicle_id,
                    v.vehicle_code,
                    v.plate_number,
                    v.brand,
                    v.model,
                    v.status        AS vehicle_status,
                    COALESCE(l.driver_id, d.driver_id) AS driver_id,
                    dr.name         AS driver_name,
                    dr.phone        AS driver_phone,
                    l.latitude,
                    l.longitude,
                    l.speed,
                    l.recorded_at,
                    d.id            AS delivery_id,
                    d.order_number,
                    d.status        AS delivery_status,
                    d.customer_name,
                    d.destination_address
                FROM {$vehicles} v
                LEFT JOIN {$lastLoc} l ON l.vehicle_id = v.id
                LEFT JOIN {$deliveries} d ON d.id = (
                    SELECT MAX(d2.id)
                    FROM {$deliveries} d2
                    WHERE d2.vehicle_id = v.id
                      AND d2.status IN ({$active})
                )
                LEFT JOIN {$drivers} dr ON dr.id = COALESCE(l.driver_id, d.driver_id)";
    }
}