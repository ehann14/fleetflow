<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\DeliveryModel;
use App\Models\DriverModel;
use App\Models\VehicleModel;

class DeliveryController extends BaseController
{
    protected $deliveryModel;
    protected $writeRoles = ['admin', 'dispatcher', 'manager']; // driver: read-only

    protected $statusesRequiringAssignment = ['assigned', 'pickup', 'on_delivery'];

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

        $delivery = $this->deliveryModel->withRelations()->where('deliveries.id', $id)->first();

        return $this->response->setStatusCode(201)->setJSON([
            'success' => true,
            'message' => 'Delivery order berhasil dibuat',
            'data'    => $delivery,
        ]);
    }

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

        $newStatus   = $data['status'] ?? $existing['status'];
        $newDriverId = array_key_exists('driver_id', $data) ? $data['driver_id'] : $existing['driver_id'];
        $newVehicleId = array_key_exists('vehicle_id', $data) ? $data['vehicle_id'] : $existing['vehicle_id'];

        if (in_array($newStatus, $this->statusesRequiringAssignment, true)
            && (empty($newDriverId) || empty($newVehicleId))) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors'  => ['driver_id' => ['Driver dan kendaraan wajib diisi untuk status ini']],
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
        $oldStatus = $existing['status'];

        $this->deliveryModel->update($id, $data);

        $this->applyStatusSideEffects($oldStatus, $newStatus, $newDriverId, $newVehicleId);

        $updated = $this->deliveryModel->withRelations()->where('deliveries.id', $id)->first();

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Delivery order berhasil diperbarui',
            'data'    => $updated,
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