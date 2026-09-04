<?php

namespace App\Models;

use CodeIgniter\Model;

class VehicleModel extends Model
{
    protected $table            = 'vehicles';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'vehicle_code', 'plate_number', 'brand', 'model', 'type', 'year',
        'capacity', 'fuel_type', 'current_mileage', 'status',
        'last_service', 'next_service',
    ];

    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    protected $validationRules = [
        'vehicle_code'    => 'required|max_length[50]|is_unique[vehicles.vehicle_code,id,{id}]',
        'plate_number'    => 'required|max_length[20]|is_unique[vehicles.plate_number,id,{id}]',
        'brand'           => 'required|max_length[100]',
        'model'           => 'required|max_length[100]',
        'type'            => 'required|max_length[50]',
        'year'            => 'required|integer|greater_than[1980]',
        'capacity'        => 'permit_empty|integer|greater_than_equal_to[0]',
        'fuel_type'       => 'permit_empty|max_length[30]',
        'current_mileage' => 'permit_empty|integer|greater_than_equal_to[0]',
        'status'          => 'permit_empty|in_list[available,assigned,on_delivery,maintenance,inactive]',
        'last_service'    => 'permit_empty|valid_date',
        'next_service'    => 'permit_empty|valid_date',
    ];

    protected $validationMessages = [
        'vehicle_code' => [
            'is_unique' => 'Kode kendaraan sudah digunakan',
        ],
        'plate_number' => [
            'is_unique' => 'Nomor plat sudah terdaftar',
        ],
    ];

    /**
     * Terapkan search + filter status ke query, dipakai oleh controller.
     */
    public function scopeSearchAndFilter(string $search = '', string $status = '')
    {
        if ($search !== '') {
            $this->groupStart()
                ->like('vehicle_code', $search)
                ->orLike('plate_number', $search)
                ->orLike('brand', $search)
                ->orLike('model', $search)
                ->groupEnd();
        }

        if ($status !== '') {
            $this->where('status', $status);
        }

        return $this;
    }
}