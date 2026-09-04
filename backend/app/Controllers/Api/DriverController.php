<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\DriverModel;

class DriverController extends BaseController
{
    protected $driverModel;
    protected $writeRoles = ['admin', 'dispatcher', 'manager'];

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
                'message' => 'Forbidden: Anda tidak memiliki akses',
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
        $drivers = $this->driverModel->orderBy('created_at', 'DESC')->paginate($perPage, 'default', $page);

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
            return $this->response->setStatusCode(404)->setJSON(['success' => false, 'message' => 'Driver tidak ditemukan']);
        }
        return $this->response->setJSON(['success' => true, 'message' => 'Success', 'data' => $driver]);
    }

    public function create()
    {
        if ($forbidden = $this->authorize($this->writeRoles)) return $forbidden;
        $data = $this->request->getJSON(true);

        if (empty($data)) {
            return $this->response->setStatusCode(400)->setJSON(['success' => false, 'message' => 'Data kosong']);
        }

        if (!$this->driverModel->validate($data)) {
            return $this->response->setStatusCode(400)->setJSON(['success' => false, 'message' => 'Validasi gagal', 'errors' => $this->driverModel->errors()]);
        }

        $id = $this->driverModel->insert($data, true);
        return $this->response->setStatusCode(201)->setJSON(['success' => true, 'message' => 'Driver berhasil ditambahkan', 'data' => $this->driverModel->find($id)]);
    }

    public function update($id = null)
    {
        if ($forbidden = $this->authorize($this->writeRoles)) return $forbidden;

        $driver = $this->driverModel->find($id);
        if (!$driver) {
            return $this->response->setStatusCode(404)->setJSON(['success' => false, 'message' => 'Driver tidak ditemukan']);
        }

        $data = $this->request->getJSON(true);

        if (empty($data)) {
            return $this->response->setStatusCode(400)->setJSON(['success' => false, 'message' => 'Data kosong']);
        }

        // PENTING: Masukkan ID ke dalam data agar validasi is_unique[...,id,{id}] bisa bekerja
        // CodeIgniter butuh field 'id' di dalam array $data untuk mengganti placeholder {id}
        $data['id'] = (int) $id;

        // Hapus hanya field sistem yang tidak boleh di-update manual
        unset($data['created_at'], $data['updated_at']);

        // Eksekusi Update
        // Model akan otomatis memvalidasi $data (yang sekarang sudah punya 'id')
        $isUpdated = $this->driverModel->update($id, $data);

        if (!$isUpdated) {
            // Jika gagal, ambil error dari model
            return $this->response->setStatusCode(400)->setJSON([
                'success' => false,
                'message' => 'Validasi gagal atau update gagal',
                'errors'  => $this->driverModel->errors()
            ]);
        }

        $updatedDriver = $this->driverModel->find($id);

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Driver berhasil diperbarui',
            'data'    => $updatedDriver,
        ]);
    }

    public function delete($id = null)
    {
        if ($forbidden = $this->authorize($this->writeRoles)) return $forbidden;
        $driver = $this->driverModel->find($id);
        if (!$driver) {
            return $this->response->setStatusCode(404)->setJSON(['success' => false, 'message' => 'Driver tidak ditemukan']);
        }
        $this->driverModel->delete($id);
        return $this->response->setJSON(['success' => true, 'message' => 'Driver berhasil dihapus']);
    }
}