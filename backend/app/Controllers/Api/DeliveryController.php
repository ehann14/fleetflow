<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\DeliveryModel;
use App\Models\DeliveryStatusHistoryModel;
use App\Models\DriverModel;
use App\Models\VehicleModel;

class DeliveryController extends BaseController
{
    protected $deliveryModel;
    protected $writeRoles = ['admin', 'dispatcher', 'manager']; // driver: read-only

    protected $statusesRequiringAssignment = ['assigned', 'pickup', 'on_delivery'];

    /**
     * Peta transisi status yang diizinkan.
     * Key = status saat ini, Value = array status berikutnya yang valid.
     * Array kosong = status akhir (tidak bisa berubah lagi).
     */
    protected $statusTransitions = [
        'pending'     => ['assigned', 'cancelled'],
        'assigned'    => ['pickup', 'cancelled'],
        'pickup'      => ['on_delivery', 'cancelled'],
        'on_delivery' => ['delivered', 'failed'],
        'delivered'   => [],
        'failed'      => [],
        'cancelled'   => [],
    ];

    public function __construct()
    {
        $this->deliveryModel = new DeliveryModel();
    }

    private function authorize(array $allowedRoles)
    {
        $userData = $this->request->userData ?? null;

        if (!$userData || !in_array($userData->role, $allowedRoles, true)) {
            return $this->response->setStatusCode(403)->setJSON([
                'success' => false,
                'message' => 'Forbidden: Anda tidak memiliki akses untuk aksi ini',
            ]);
        }

        return null;
    }

    public function index()
    {
        $page     = (int) ($this->request->getGet('page') ?? 1);
        $perPage  = 10;
        $search   = (string) ($this->request->getGet('search') ?? '');
        $status   = (string) ($this->request->getGet('status') ?? '');
        $priority = (string) ($this->request->getGet('priority') ?? '');

        $this->deliveryModel->withRelations()->scopeSearchAndFilter($search, $status, $priority);

        $total      = $this->deliveryModel->countAllResults(false);
        $deliveries = $this->deliveryModel->orderBy('deliveries.created_at', 'DESC')
            ->paginate($perPage, 'default', $page);

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Success',
            'data'    => $deliveries,
            'meta'    => [
                'current_page' => $page,
                'last_page'    => (int) ceil($total / $perPage) ?: 1,
                'per_page'     => $perPage,
                'total'        => $total,
            ],
        ]);
    }

    public function show($id = null)
    {
        $delivery = $this->deliveryModel->withRelations()->where('deliveries.id', $id)->first();

        if (!$delivery) {
            return $this->response->setStatusCode(404)->setJSON([
                'success' => false,
                'message' => 'Delivery order tidak ditemukan',
            ]);
        }

        return $this->response->setJSON(['success' => true, 'message' => 'Success', 'data' => $delivery]);
    }

    public function create()
    {
        if ($forbidden = $this->authorize($this->writeRoles)) return $forbidden;

        $data = $this->request->getJSON(true);

        if (empty($data)) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Request body kosong. Pastikan Content-Type: application/json',
            ]);
        }

        if (empty($data['order_number'])) {
            $data['order_number'] = $this->deliveryModel->generateOrderNumber();
        }

        $status = $data['status'] ?? 'pending';
        if (in_array($status, $this->statusesRequiringAssignment, true)
            && (empty($data['driver_id']) || empty($data['vehicle_id']))) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors'  => ['driver_id' => ['Driver dan kendaraan wajib diisi untuk status ini']],
            ]);
        }

        if (!$this->deliveryModel->validate($data)) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors'  => $this->deliveryModel->errors(),
            ]);
        }

        $id = $this->deliveryModel->insert($data, true);

        $this->applyStatusSideEffects(
            null,
            $status,
            $data['driver_id'] ?? null,
            $data['vehicle_id'] ?? null
        );

        // Catat history pembuatan delivery
        $userData = $this->request->userData ?? null;
        (new DeliveryStatusHistoryModel())->insert([
            'delivery_id' => $id,
            'from_status' => null,
            'to_status'   => $status,
            'notes'       => 'Delivery order dibuat',
            'changed_by'  => $userData->id ?? null,
        ]);

        $delivery = $this->deliveryModel->withRelations()->where('deliveries.id', $id)->first();

        return $this->response->setStatusCode(201)->setJSON([
            'success' => true,
            'message' => 'Delivery order berhasil dibuat',
            'data'    => $delivery,
        ]);
    }

    /**
     * Update data delivery NON-status (alamat, catatan, dll).
     * PERHATIAN: Perubahan status TIDAK diizinkan lewat endpoint ini.
     * Gunakan POST /deliveries/{id}/status untuk mengubah status.
     */
    public function update($id = null)
    {
        if ($forbidden = $this->authorize($this->writeRoles)) return $forbidden;

        $existing = $this->deliveryModel->find($id);
        if (!$existing) {
            return $this->response->setStatusCode(404)->setJSON([
                'success' => false,
                'message' => 'Delivery order tidak ditemukan',
            ]);
        }

        $data = $this->request->getJSON(true);
        if (empty($data)) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Request body kosong. Pastikan Content-Type: application/json',
            ]);
        }

        // BLOKIR perubahan status lewat endpoint ini
        if (array_key_exists('status', $data)) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Perubahan status tidak diizinkan lewat endpoint ini. Gunakan POST /api/deliveries/' . $id . '/status',
                'errors'  => ['status' => ['Gunakan endpoint /status untuk mengubah status delivery']],
            ]);
        }

        // BLOKIR perubahan driver_id/vehicle_id lewat endpoint ini (harus via /assign)
        if (array_key_exists('driver_id', $data) || array_key_exists('vehicle_id', $data)) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Perubahan driver/kendaraan tidak diizinkan lewat endpoint ini. Gunakan POST /api/deliveries/' . $id . '/assign',
            ]);
        }

        $data['id'] = $id; // dipakai oleh rule is_unique[...,{id}]

        if (!$this->deliveryModel->validate($data)) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors'  => $this->deliveryModel->errors(),
            ]);
        }

        unset($data['id']);
        $this->deliveryModel->update($id, $data);

        $updated = $this->deliveryModel->withRelations()->where('deliveries.id', $id)->first();

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Delivery order berhasil diperbarui',
            'data'    => $updated,
        ]);
    }

    /**
     * Assign driver dan kendaraan ke delivery order.
     * Validasi: driver aktif, vehicle tidak maintenance/inactive,
     * driver tidak sedang menangani delivery aktif lain,
     * vehicle tidak sedang dipakai delivery aktif lain.
     */
    public function assign($id = null)
    {
        if ($forbidden = $this->authorize($this->writeRoles)) return $forbidden;

        $delivery = $this->deliveryModel->find($id);
        if (!$delivery) {
            return $this->response->setStatusCode(404)->setJSON([
                'success' => false,
                'message' => 'Delivery order tidak ditemukan',
            ]);
        }

        $data = $this->request->getJSON(true);

        if (empty($data['driver_id']) || empty($data['vehicle_id'])) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors'  => [
                    'driver_id'  => empty($data['driver_id']) ? ['Driver wajib dipilih'] : [],
                    'vehicle_id' => empty($data['vehicle_id']) ? ['Kendaraan wajib dipilih'] : [],
                ],
            ]);
        }

        $driverId  = (int) $data['driver_id'];
        $vehicleId = (int) $data['vehicle_id'];

        $driverModel  = new DriverModel();
        $vehicleModel = new VehicleModel();

        $driver  = $driverModel->find($driverId);
        $vehicle = $vehicleModel->find($vehicleId);

        if (!$driver) {
            return $this->response->setStatusCode(404)->setJSON([
                'success' => false, 'message' => 'Driver tidak ditemukan',
            ]);
        }
        if (!$vehicle) {
            return $this->response->setStatusCode(404)->setJSON([
                'success' => false, 'message' => 'Kendaraan tidak ditemukan',
            ]);
        }

        // Driver harus aktif
        if ($driver['status'] !== 'active') {
            return $this->response->setStatusCode(422)->setJSON([
                'success' => false,
                'message' => 'Driver tidak aktif',
                'errors'  => ['driver_id' => ["Driver berstatus {$driver['status']}, tidak dapat ditugaskan"]],
            ]);
        }

        // Vehicle tidak boleh maintenance / inactive
        if (in_array($vehicle['status'], ['maintenance', 'inactive'], true)) {
            return $this->response->setStatusCode(422)->setJSON([
                'success' => false,
                'message' => 'Kendaraan tidak tersedia',
                'errors'  => ['vehicle_id' => ["Kendaraan sedang {$vehicle['status']}"]],
            ]);
        }

        $activeStatuses = ['assigned', 'pickup', 'on_delivery'];

        // Driver tidak sedang menangani delivery aktif lain
        $driverBusy = $this->deliveryModel
            ->where('driver_id', $driverId)
            ->whereIn('status', $activeStatuses)
            ->where('id !=', $id)
            ->countAllResults();

        if ($driverBusy > 0) {
            return $this->response->setStatusCode(422)->setJSON([
                'success' => false,
                'message' => 'Driver sedang bertugas',
                'errors'  => ['driver_id' => ['Driver sedang menangani delivery lain']],
            ]);
        }

        // Vehicle tidak sedang dipakai delivery aktif lain
        $vehicleBusy = $this->deliveryModel
            ->where('vehicle_id', $vehicleId)
            ->whereIn('status', $activeStatuses)
            ->where('id !=', $id)
            ->countAllResults();

        if ($vehicleBusy > 0) {
            return $this->response->setStatusCode(422)->setJSON([
                'success' => false,
                'message' => 'Kendaraan sedang digunakan',
                'errors'  => ['vehicle_id' => ['Kendaraan sedang digunakan delivery lain']],
            ]);
        }

        // Semua lolos → assign
        $oldStatus = $delivery['status'];
        $this->deliveryModel->update($id, [
            'driver_id'  => $driverId,
            'vehicle_id' => $vehicleId,
            'status'     => 'assigned',
        ]);

        $vehicleModel->update($vehicleId, ['status' => 'assigned']);

        // Catat history assignment
        $userData = $this->request->userData ?? null;
        (new DeliveryStatusHistoryModel())->insert([
            'delivery_id' => $id,
            'from_status' => $oldStatus,
            'to_status'   => 'assigned',
            'notes'       => 'Driver dan kendaraan ditugaskan',
            'changed_by'  => $userData->id ?? null,
        ]);

        $updated = $this->deliveryModel->withRelations()->where('deliveries.id', $id)->first();

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Driver dan kendaraan berhasil ditugaskan',
            'data'    => $updated,
        ]);
    }

    /**
     * Update status delivery dengan validasi transisi & catat history.
     * POST /api/deliveries/{id}/status
     * Body: { "status": "pickup", "notes": "..." }
     */
    public function updateStatus($id = null)
    {
        if ($forbidden = $this->authorize($this->writeRoles)) return $forbidden;

        $delivery = $this->deliveryModel->find($id);
        if (!$delivery) {
            return $this->response->setStatusCode(404)->setJSON([
                'success' => false, 'message' => 'Delivery order tidak ditemukan',
            ]);
        }

        $data = $this->request->getJSON(true);
        $newStatus = $data['status'] ?? null;
        $notes     = $data['notes'] ?? null;
        $current   = $delivery['status'];

        if (!$newStatus) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false, 'message' => 'Status wajib diisi',
            ]);
        }

        $allowedNext = $this->statusTransitions[$current] ?? [];

        if (!in_array($newStatus, $allowedNext, true)) {
            return $this->response->setStatusCode(422)->setJSON([
                'success' => false,
                'message' => "Transisi status tidak valid: {$current} → {$newStatus}",
                'errors'  => ['status' => ["Status saat ini ({$current}) hanya bisa berubah ke: " . (empty($allowedNext) ? 'tidak ada (status akhir)' : implode(', ', $allowedNext))]],
            ]);
        }

        // Status assigned/pickup/on_delivery wajib punya driver & vehicle
        if (in_array($newStatus, $this->statusesRequiringAssignment, true)
            && (empty($delivery['driver_id']) || empty($delivery['vehicle_id']))) {
            return $this->response->setStatusCode(422)->setJSON([
                'success' => false,
                'message' => 'Driver dan kendaraan belum ditugaskan',
            ]);
        }

        $this->deliveryModel->update($id, ['status' => $newStatus]);

        $this->applyStatusSideEffects($current, $newStatus, $delivery['driver_id'], $delivery['vehicle_id']);

        $userData = $this->request->userData ?? null;
        (new DeliveryStatusHistoryModel())->insert([
            'delivery_id' => $id,
            'from_status' => $current,
            'to_status'   => $newStatus,
            'notes'       => $notes,
            'changed_by'  => $userData->id ?? null,
        ]);

        $updated = $this->deliveryModel->withRelations()->where('deliveries.id', $id)->first();

        return $this->response->setJSON([
            'success' => true,
            'message' => "Status berhasil diubah menjadi {$newStatus}",
            'data'    => $updated,
        ]);
    }

    /**
     * Ambil riwayat perubahan status delivery.
     * GET /api/deliveries/{id}/history
     */
    public function history($id = null)
    {
        $delivery = $this->deliveryModel->find($id);
        if (!$delivery) {
            return $this->response->setStatusCode(404)->setJSON([
                'success' => false, 'message' => 'Delivery order tidak ditemukan',
            ]);
        }

        $history = (new DeliveryStatusHistoryModel())
            ->where('delivery_id', $id)
            ->orderBy('created_at', 'ASC')
            ->findAll();

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Success',
            'data'    => $history,
        ]);
    }

    /**
     * Sinkronisasi status kendaraan & statistik driver berdasarkan perubahan status delivery.
     */
    private function applyStatusSideEffects(?string $oldStatus, string $newStatus, $driverId, $vehicleId): void
    {
        if ($vehicleId) {
            $vehicleStatusMap = [
                'assigned'    => 'assigned',
                'pickup'      => 'on_delivery',
                'on_delivery' => 'on_delivery',
                'delivered'   => 'available',
                'failed'      => 'available',
                'cancelled'   => 'available',
            ];

            if (isset($vehicleStatusMap[$newStatus])) {
                (new VehicleModel())->update($vehicleId, ['status' => $vehicleStatusMap[$newStatus]]);
            }
        }

        // Statistik driver hanya disinkron saat delivery BARU SAJA sampai ke status akhir
        if ($driverId && $oldStatus !== $newStatus && in_array($newStatus, ['delivered', 'failed'], true)) {
            $driverModel = new DriverModel();
            $driver      = $driverModel->find($driverId);

            if ($driver) {
                $update = ['total_deliveries' => (int) $driver['total_deliveries'] + 1];
                $update[$newStatus === 'delivered' ? 'completed_deliveries' : 'failed_deliveries']
                    = (int) $driver[$newStatus === 'delivered' ? 'completed_deliveries' : 'failed_deliveries'] + 1;

                $driverModel->update($driverId, $update);
            }
        }
    }
}