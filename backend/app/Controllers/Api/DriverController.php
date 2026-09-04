<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\DriverModel;

class DriverController extends BaseController
{
    protected $driverModel;
    protected $writeRoles = ['admin', 'dispatcher', 'manager']; // driver: read-only

    public function __construct()
    {
        $this->driverModel = new DriverModel();
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

        $this->driverModel->scopeSearchAndFilter($search, $status);

        $total   = $this->driverModel->countAllResults(false);
        $drivers = $this->driverModel->orderBy('created_at', 'DESC')
            ->paginate($perPage, 'default', $page);

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Success',
            'data'    => $drivers,
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
        $driver = $this->driverModel->find($id);

        if (!$driver) {
            return $this->response->setStatusCode(404)->setJSON([
                'success' => false,
                'message' => 'Driver tidak ditemukan',
            ]);
        }

        return $this->response->setJSON(['success' => true, 'message' => 'Success', 'data' => $driver]);
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

        if (!$this->driverModel->validate($data)) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors'  => $this->driverModel->errors(),
            ]);
        }

        $id     = $this->driverModel->insert($data, true);
        $driver = $this->driverModel->find($id);

        return $this->response->setStatusCode(201)->setJSON([
            'success' => true,
            'message' => 'Driver berhasil ditambahkan',
            'data'    => $driver,
        ]);
    }

    public function update($id = null)
    {
        if ($forbidden = $this->authorize($this->writeRoles)) return $forbidden;

        $driver = $this->driverModel->find($id);
        if (!$driver) {
            return $this->response->setStatusCode(404)->setJSON([
                'success' => false,
                'message' => 'Driver tidak ditemukan',
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

        if (!$this->driverModel->validate($data)) {
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors'  => $this->driverModel->errors(),
            ]);
        }

        unset($data['id']);
        $this->driverModel->update($id, $data);
        $updated = $this->driverModel->find($id);

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Driver berhasil diperbarui',
            'data'    => $updated,
        ]);
    }

    public function delete($id = null)
    {
        if ($forbidden = $this->authorize($this->writeRoles)) return $forbidden;

        $driver = $this->driverModel->find($id);
        if (!$driver) {
            return $this->response->setStatusCode(404)->setJSON([
                'success' => false,
                'message' => 'Driver tidak ditemukan',
            ]);
        }

        $this->driverModel->delete($id);

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Driver berhasil dihapus',
        ]);
    }
}