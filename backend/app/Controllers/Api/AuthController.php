<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\UserModel;
use App\Libraries\Jwt;

class AuthController extends BaseController
{
    protected $userModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
    }

    public function login()
    {
        // Ambil data JSON dari request
        $data = $this->request->getJSON(true);
        
        if (empty($data)) {
            return $this->response->setStatusCode(400)
                ->setJSON([
                    'success' => false,
                    'message' => 'Request body kosong. Pastikan Content-Type: application/json'
                ]);
        }

        // Validasi
        $rules = [
            'email'    => 'required|valid_email',
            'password' => 'required',
        ];

        if (!$this->validateData($data, $rules)) {
            return $this->response->setStatusCode(400)
                ->setJSON([
                    'success' => false,
                    'message' => 'Validasi gagal',
                    'errors'  => $this->validator->getErrors()
                ]);
        }

        $email = $data['email'];
        $password = $data['password'];

        // Cari user
        $user = $this->userModel->where('email', $email)->first();

        if (!$user || !password_verify($password, $user['password'])) {
            return $this->response->setStatusCode(401)
                ->setJSON([
                    'success' => false,
                    'message' => 'Email atau password salah'
                ]);
        }

        // Generate token
        $payload = [
            'id'    => $user['id'],
            'email' => $user['email'],
            'role'  => $user['role']
        ];

        try {
            $token = Jwt::encode($payload);
        } catch (\Exception $e) {
            return $this->response->setStatusCode(500)
                ->setJSON(['success' => false, 'message' => 'Gagal membuat token: ' . $e->getMessage()]);
        }

        unset($user['password']);

        return $this->response->setJSON([
            'success' => true,
            'data'    => [
                'token' => $token,
                'user'  => $user
            ]
        ]);
    }

    public function me()
    {
        $userData = $this->request->userData ?? null;
        
        if (!$userData) {
            return $this->response->setStatusCode(401)
                ->setJSON(['success' => false, 'message' => 'Unauthorized']);
        }

        $user = $this->userModel->find($userData->id);

        if (!$user) {
            return $this->response->setStatusCode(404)
                ->setJSON(['success' => false, 'message' => 'User tidak ditemukan']);
        }

        unset($user['password']);

        return $this->response->setJSON([
            'success' => true,
            'data'    => $user
        ]);
    }

    public function logout()
    {
        return $this->response->setJSON([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }
}