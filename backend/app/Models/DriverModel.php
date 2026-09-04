<?php

namespace App\Models;

use CodeIgniter\Model;

class DriverModel extends Model
{
    protected $table            = 'drivers';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'employee_id', 'name', 'phone', 'email',
        'license_number', 'license_expiry', 'status',
        'total_deliveries', 'completed_deliveries', 'failed_deliveries', 'rating',
    ];

    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    protected $validationRules = [
        'employee_id'    => 'required|max_length[30]|is_unique[drivers.employee_id,id,{id}]',
        'name'           => 'required|max_length[100]',
        'phone'          => 'required|max_length[20]',
        'email'          => 'required|valid_email|is_unique[drivers.email,id,{id}]',
        'license_number' => 'required|max_length[50]|is_unique[drivers.license_number,id,{id}]',
        'license_expiry' => 'required|valid_date',
        'status'         => 'permit_empty|in_list[active,inactive,on_leave]',
    ];

    protected $validationMessages = [
        'employee_id' => [
            'is_unique' => 'ID karyawan sudah digunakan',
        ],
        'email' => [
            'is_unique' => 'Email sudah terdaftar',
        ],
        'license_number' => [
            'is_unique' => 'Nomor SIM sudah terdaftar',
        ],
    ];

    /**
     * Terapkan search + filter status ke query, dipakai oleh controller.
     */
    public function scopeSearchAndFilter(string $search = '', string $status = '')
    {
        if ($search !== '') {
            $this->groupStart()
                ->like('name', $search)
                ->orLike('employee_id', $search)
                ->orLike('phone', $search)
                ->orLike('email', $search)
                ->groupEnd();
        }

        if ($status !== '') {
            $this->where('status', $status);
        }

        return $this;
    }

    /**
     * Hitung ulang rating rata-rata dari (completed / total) sebagai proxy
     * sederhana selama modul Delivery belum menyediakan rating asli.
     */
    public function recalculateStats(int $driverId, int $completed, int $failed): void
    {
        $total  = $completed + $failed;
        $rating = $total > 0 ? round(($completed / $total) * 5, 2) : 0;

        $this->update($driverId, [
            'total_deliveries'     => $total,
            'completed_deliveries' => $completed,
            'failed_deliveries'    => $failed,
            'rating'               => $rating,
        ]);
    }
}