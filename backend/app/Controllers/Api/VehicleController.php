<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\VehicleModel;

class VehicleController extends BaseController
{
    protected $vehicleModel;
    protected $writeRoles = ['admin', 'dispatcher', 'manager']; // driver: read-only

    public function __construct()
    {
        $this->vehicleModel = new VehicleModel();
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
        $page    = (int) ($this->request->getGet('page') ?? 1);
        $perPage = 10;
        $search  = (string) ($this->request->getGet('search') ?? '');
        $status  = (string) ($this->request->getGet('status') ?? '');

        $this->vehicleModel->scopeSearchAndFilter($search, $status);

        $total    = $this->vehicleModel->countAllResults(false);
        $vehicles = $this->vehicleModel->orderBy('created_at', 'DESC')
            ->paginate($perPage, 'default', $page);

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Success',
            'data'    => $vehicles,
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
        $vehicle = $this->vehicleModel->find($id);

        if (!$vehicle) {
            return $this->response->setStatusCode(404)->setJSON([
                'success' => false,
                'message' => 'Kendaraan tidak ditemukan',
            ]);
        }

        return $this->response->setJSON(['success' => true, 'message' => 'Success', 'data' => $vehicle]);
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

        if (!$this->vehicleModel->validate($data)) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors'  => $this->vehicleModel->errors(),
            ]);
        }

        $id      = $this->vehicleModel->insert($data, true);
        $vehicle = $this->vehicleModel->find($id);

        return $this->response->setStatusCode(201)->setJSON([
            'success' => true,
            'message' => 'Kendaraan berhasil ditambahkan',
            'data'    => $vehicle,
        ]);
    }

    public function update($id = null)
    {
        if ($forbidden = $this->authorize($this->writeRoles)) return $forbidden;

        $vehicle = $this->vehicleModel->find($id);
        if (!$vehicle) {
            return $this->response->setStatusCode(404)->setJSON([
                'success' => false,
                'message' => 'Kendaraan tidak ditemukan',
            ]);
        }

        $data = $this->request->getJSON(true);
        if (empty($data)) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Request body kosong. Pastikan Content-Type: application/json',
            ]);
        }

        $data['id'] = $id; // dipakai oleh rule is_unique[...,{id}]

        if (!$this->vehicleModel->validate($data)) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors'  => $this->vehicleModel->errors(),
            ]);
        }

        unset($data['id']);
        $this->vehicleModel->update($id, $data);
        $updated = $this->vehicleModel->find($id);

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Kendaraan berhasil diperbarui',
            'data'    => $updated,
        ]);
    }

    public function delete($id = null)
    {
        if ($forbidden = $this->authorize($this->writeRoles)) return $forbidden;

        $vehicle = $this->vehicleModel->find($id);
        if (!$vehicle) {
            return $this->response->setStatusCode(404)->setJSON([
                'success' => false,
                'message' => 'Kendaraan tidak ditemukan',
            ]);
        }

        $this->vehicleModel->delete($id);

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Kendaraan berhasil dihapus',
        ]);
    }
}