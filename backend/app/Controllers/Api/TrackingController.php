<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\AuthContext; // <-- PASTIKAN INI DIIMPORT
use App\Models\DeliveryModel;
use App\Models\DriverModel;
use App\Models\VehicleLocationModel;
use App\Models\VehicleModel;

class TrackingController extends BaseController
{
    /** Kendaraan dianggap online bila titik GPS terakhirnya tidak lebih tua dari ini (detik). */
    private const ONLINE_THRESHOLD_SECONDS = 300;

    /** Toleransi selisih jam device yang lebih cepat dari server (detik). */
    private const FUTURE_SKEW_SECONDS = 300;

    private const HISTORY_DEFAULT_LIMIT = 100;
    private const HISTORY_MAX_LIMIT     = 1000;

    protected $locationModel;

    /** Yang boleh MENGIRIM lokasi. driver = dari aplikasi driver; admin/dispatcher = simulasi/koreksi. */
    protected $sendRoles = ['admin', 'dispatcher', 'driver'];

    /** Yang boleh MELIHAT peta tracking. Driver tidak boleh melihat posisi kendaraan lain. */
    protected $readRoles = ['admin', 'dispatcher', 'manager'];

    public function __construct()
    {
        $this->locationModel = new VehicleLocationModel();
    }

    /**
     * Cek otorisasi menggunakan AuthContext (bukan $this->request->userData)
     */
    private function authorize(array $allowedRoles)
    {
        // AMBIL DARI AUTHCONTEXT SESUAI FILTER
        $userData = AuthContext::get(); 

        if (!$userData || !in_array($userData->role, $allowedRoles, true)) {
            return $this->response->setStatusCode(403)->setJSON([
                'success' => false,
                'message' => 'Forbidden: Anda tidak memiliki akses untuk aksi ini. Role diperlukan: ' . implode(', ', $allowedRoles),
            ]);
        }

        return null;
    }

    // ------------------------------------------------------------------
    // POST /api/tracking/location
    // ------------------------------------------------------------------
    public function storeLocation()
    {
        if ($forbidden = $this->authorize($this->sendRoles)) return $forbidden;

        try {
            $data = $this->request->getJSON(true);
        } catch (\Throwable $e) {
            $data = null;
        }

        if (empty($data) || !is_array($data)) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Request body kosong atau bukan JSON valid. Pastikan Content-Type: application/json',
            ]);
        }

        // AMBIL DARI AUTHCONTEXT
        $userData = AuthContext::get();
        $isDriver = $userData->role === 'driver';
        $errors   = [];

        // --- vehicle_id ---
        $vehicleId = $this->toPositiveInt($data['vehicle_id'] ?? null);
        if ($vehicleId === null) {
            $errors['vehicle_id'] = ['vehicle_id wajib diisi dan berupa angka > 0'];
        }

        // --- driver_id (opsional untuk role driver, wajib untuk role lain) ---
        $driverId = null;
        if (isset($data['driver_id']) && $data['driver_id'] !== '') {
            $driverId = $this->toPositiveInt($data['driver_id']);
            if ($driverId === null) {
                $errors['driver_id'] = ['driver_id harus berupa angka > 0'];
            }
        } elseif (!$isDriver) {
            $errors['driver_id'] = ['driver_id wajib diisi'];
        }

        // --- latitude / longitude / speed ---
        $latitude = $longitude = null;

        if (!isset($data['latitude']) || !is_numeric($data['latitude'])) {
            $errors['latitude'] = ['latitude wajib diisi dan berupa angka'];
        } elseif ((float) $data['latitude'] < -90 || (float) $data['latitude'] > 90) {
            $errors['latitude'] = ['latitude harus antara -90 dan 90'];
        } else {
            $latitude = (float) $data['latitude'];
        }

        if (!isset($data['longitude']) || !is_numeric($data['longitude'])) {
            $errors['longitude'] = ['longitude wajib diisi dan berupa angka'];
        } elseif ((float) $data['longitude'] < -180 || (float) $data['longitude'] > 180) {
            $errors['longitude'] = ['longitude harus antara -180 dan 180'];
        } else {
            $longitude = (float) $data['longitude'];
        }

        $speed = 0.0;
        if (isset($data['speed']) && $data['speed'] !== '') {
            if (!is_numeric($data['speed']) || (float) $data['speed'] < 0 || (float) $data['speed'] > 400) {
                $errors['speed'] = ['speed (km/jam) harus berupa angka antara 0 dan 400'];
            } else {
                $speed = round((float) $data['speed'], 2);
            }
        }

        // --- timestamp (opsional, default = sekarang) ---
        $recordedAt = date('Y-m-d H:i:s');
        if (isset($data['timestamp']) && $data['timestamp'] !== '') {
            $dt = $this->parseTimestamp($data['timestamp']);
            if ($dt === null) {
                $errors['timestamp'] = ['timestamp tidak valid. Gunakan format "YYYY-MM-DD HH:MM:SS" atau ISO 8601 (mis. 2026-09-24T10:15:30Z)'];
            } elseif ($dt->getTimestamp() > time() + self::FUTURE_SKEW_SECONDS) {
                $errors['timestamp'] = ['timestamp tidak boleh di masa depan'];
            } else {
                $recordedAt = $dt->format('Y-m-d H:i:s');
            }
        }

        if (!empty($errors)) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors'  => $errors,
            ]);
        }

        // --- Role driver: driver_id diambil dari akun yang login (dicocokkan lewat email) ---
        if ($isDriver) {
            $me = (new DriverModel())->where('email', $userData->email)->first();

            if (!$me) {
                return $this->response->setStatusCode(403)->setJSON([
                    'success' => false,
                    'message' => 'Akun Anda belum terhubung ke data driver (email akun harus sama dengan email di data driver)',
                ]);
            }

            if ($driverId !== null && $driverId !== (int) $me['id']) {
                return $this->response->setStatusCode(403)->setJSON([
                    'success' => false,
                    'message' => 'driver_id tidak sesuai dengan akun yang sedang login',
                ]);
            }

            $driverId = (int) $me['id'];
        }

        // --- Pastikan vehicle & driver ada ---
        if (!(new VehicleModel())->find($vehicleId)) {
            return $this->response->setStatusCode(404)->setJSON([
                'success' => false, 'message' => 'Kendaraan tidak ditemukan',
            ]);
        }

        if (!$isDriver && !(new DriverModel())->find($driverId)) {
            return $this->response->setStatusCode(404)->setJSON([
                'success' => false, 'message' => 'Driver tidak ditemukan',
            ]);
        }

        // --- Role driver hanya boleh mengirim lokasi untuk kendaraan yang sedang ia bawa ---
        if ($isDriver) {
            $hasActiveTask = (new DeliveryModel())
                ->where('driver_id', $driverId)
                ->where('vehicle_id', $vehicleId)
                ->whereIn('status', ['assigned', 'pickup', 'on_delivery'])
                ->countAllResults();

            if ($hasActiveTask === 0) {
                return $this->response->setStatusCode(403)->setJSON([
                    'success' => false,
                    'message' => 'Anda tidak memiliki tugas pengiriman aktif dengan kendaraan ini',
                ]);
            }
        }

        // --- Simpan ---
        $point = [
            'vehicle_id'  => $vehicleId,
            'driver_id'   => $driverId,
            'latitude'    => $latitude,
            'longitude'   => $longitude,
            'speed'       => $speed,
            'recorded_at' => $recordedAt,
        ];

        try {
            $id = $this->locationModel->record($point);
        } catch (\Throwable $e) {
            log_message('error', 'Tracking record error: ' . $e->getMessage());
            $id = 0;
        }

        if ($id === 0) {
            return $this->response->setStatusCode(500)->setJSON([
                'success' => false,
                'message' => 'Gagal menyimpan lokasi',
            ]);
        }

        return $this->response->setStatusCode(201)->setJSON([
            'success' => true,
            'message' => 'Lokasi berhasil disimpan',
            'data'    => [
                'id'         => $id,
                'vehicle_id' => $vehicleId,
                'driver_id'  => $driverId,
                'latitude'   => $latitude,
                'longitude'  => $longitude,
                'speed'      => $speed,
                'timestamp'  => $recordedAt,
            ],
        ]);
    }

    // ------------------------------------------------------------------
    // GET /api/tracking
    // Query: search, status (status kendaraan), online (1 = hanya yang online)
    // ------------------------------------------------------------------
    public function index()
    {
        if ($forbidden = $this->authorize($this->readRoles)) return $forbidden;

        $search = trim((string) ($this->request->getGet('search') ?? ''));
        $status = trim((string) ($this->request->getGet('status') ?? ''));
        $online = (string) ($this->request->getGet('online') ?? '');

        $validStatuses = ['available', 'assigned', 'on_delivery', 'maintenance', 'inactive'];
        if ($status !== '' && !in_array($status, $validStatuses, true)) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors'  => ['status' => ['status harus salah satu dari: ' . implode(', ', $validStatuses)]],
            ]);
        }

        $onlineSince = in_array($online, ['1', 'true'], true)
            ? date('Y-m-d H:i:s', time() - self::ONLINE_THRESHOLD_SECONDS)
            : null;

        $rows  = $this->locationModel->findCurrent($search, $status, $onlineSince);
        $items = array_map(fn(array $r) => $this->formatItem($r), $rows);

        $onlineCount = count(array_filter($items, fn(array $i) => $i['is_online']));

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Success',
            'data'    => $items,
            'meta'    => [
                'total'                    => count($items),
                'online'                   => $onlineCount,
                'online_threshold_seconds' => self::ONLINE_THRESHOLD_SECONDS,
            ],
        ]);
    }

    // ------------------------------------------------------------------
    // GET /api/tracking/{vehicleId}
    // Query: limit (default 100, maks 1000), from, to  -> untuk riwayat titik
    // ------------------------------------------------------------------
    public function show($vehicleId = null)
    {
        if ($forbidden = $this->authorize($this->readRoles)) return $forbidden;

        $vehicleId = (int) $vehicleId;

        // --- parameter riwayat ---
        $errors = [];

        $limit = self::HISTORY_DEFAULT_LIMIT;
        $limitParam = $this->request->getGet('limit');
        if ($limitParam !== null && $limitParam !== '') {
            if (!ctype_digit((string) $limitParam) || (int) $limitParam < 1 || (int) $limitParam > self::HISTORY_MAX_LIMIT) {
                $errors['limit'] = ['limit harus angka 1 sampai ' . self::HISTORY_MAX_LIMIT];
            } else {
                $limit = (int) $limitParam;
            }
        }

        $range = ['from' => null, 'to' => null];
        foreach (array_keys($range) as $name) {
            $param = $this->request->getGet($name);
            if ($param === null || $param === '') continue;

            $dt = $this->parseTimestamp($param);
            if ($dt === null) {
                $errors[$name] = ["{$name} tidak valid. Gunakan format \"YYYY-MM-DD HH:MM:SS\" atau ISO 8601"];
            } else {
                $range[$name] = $dt->format('Y-m-d H:i:s');
            }
        }
        $from = $range['from'];
        $to   = $range['to'];

        if (!empty($errors)) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors'  => $errors,
            ]);
        }

        // --- data ---
        $row = $this->locationModel->findCurrentByVehicle($vehicleId);

        if (!$row) {
            return $this->response->setStatusCode(404)->setJSON([
                'success' => false,
                'message' => 'Kendaraan tidak ditemukan',
            ]);
        }

        $history = array_map(
            fn(array $h) => [
                'driver_id' => $h['driver_id'] !== null ? (int) $h['driver_id'] : null,
                'latitude'  => (float) $h['latitude'],
                'longitude' => (float) $h['longitude'],
                'speed'     => (float) $h['speed'],
                'timestamp' => $h['recorded_at'],
            ],
            $this->locationModel->history($vehicleId, $limit, $from, $to)
        );

        $item            = $this->formatItem($row);
        $item['history'] = $history;

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Success',
            'data'    => $item,
            'meta'    => [
                'history_count'            => count($history),
                'history_limit'            => $limit,
                'online_threshold_seconds' => self::ONLINE_THRESHOLD_SECONDS,
            ],
        ]);
    }

    // ------------------------------------------------------------------
    // Helper
    // ------------------------------------------------------------------

    /**
     * Bentuk 1 item tracking. Struktur SAMA untuk list (/tracking) dan detail (/tracking/{id}).
     */
    private function formatItem(array $r): array
    {
        $timestamp = $r['recorded_at'] ?? null;
        $seconds   = null;

        if ($timestamp !== null) {
            $tz      = new \DateTimeZone(config('App')->appTimezone);
            $seconds = max(0, time() - (new \DateTimeImmutable($timestamp, $tz))->getTimestamp());
        }

        return [
            'vehicle_id'           => (int) $r['vehicle_id'],
            'vehicle_code'         => $r['vehicle_code'],
            'plate_number'         => $r['plate_number'],
            'brand'                => $r['brand'],
            'model'                => $r['model'],
            'vehicle_status'       => $r['vehicle_status'],
            'driver_id'            => $r['driver_id'] !== null ? (int) $r['driver_id'] : null,
            'driver_name'          => $r['driver_name'],
            'driver_phone'         => $r['driver_phone'],
            'latitude'             => $r['latitude'] !== null ? (float) $r['latitude'] : null,
            'longitude'            => $r['longitude'] !== null ? (float) $r['longitude'] : null,
            'speed'                => $r['speed'] !== null ? (float) $r['speed'] : null,
            'timestamp'            => $timestamp,
            'seconds_since_update' => $seconds,
            'is_online'            => $seconds !== null && $seconds <= self::ONLINE_THRESHOLD_SECONDS,
            'delivery'             => $r['delivery_id'] !== null ? [
                'id'                  => (int) $r['delivery_id'],
                'order_number'        => $r['order_number'],
                'status'              => $r['delivery_status'],
                'customer_name'       => $r['customer_name'],
                'destination_address' => $r['destination_address'],
            ] : null,
        ];
    }

    /** Terima int atau string angka murni > 0, selain itu null. */
    private function toPositiveInt($value): ?int
    {
        if (is_int($value)) {
            return $value > 0 ? $value : null;
        }

        if (is_string($value) && ctype_digit($value) && (int) $value > 0) {
            return (int) $value;
        }

        return null;
    }

    /**
     * Parse timestamp dari client.
     * Diterima: "YYYY-MM-DD HH:MM:SS", ISO 8601 (dengan Z / offset), atau epoch detik.
     * Tanpa offset -> dianggap zona waktu server (appTimezone).
     */
    private function parseTimestamp($value): ?\DateTimeImmutable
    {
        try {
            $tz = new \DateTimeZone(config('App')->appTimezone);

            if (is_int($value) || (is_string($value) && ctype_digit($value) && strlen($value) <= 10)) {
                return (new \DateTimeImmutable('@' . $value))->setTimezone($tz);
            }

            if (is_string($value)
                && preg_match('/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/', trim($value))
            ) {
                return (new \DateTimeImmutable(trim($value), $tz))->setTimezone($tz);
            }
        } catch (\Throwable $e) {
            // jatuh ke return null
        }

        return null;
    }
}