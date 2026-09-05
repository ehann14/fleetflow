<?php

namespace App\Models;

use CodeIgniter\Model;

class DeliveryModel extends Model
{
    protected $table            = 'deliveries';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'order_number', 'customer_name', 'customer_phone',
        'pickup_address', 'destination_address',
        'package_description', 'package_weight', 'package_quantity',
        'delivery_date', 'priority', 'driver_id', 'vehicle_id',
        'status', 'notes',
    ];

    protected array $casts = [
        'package_weight'   => 'float',
        'package_quantity' => 'integer',
        'driver_id'        => '?integer',
        'vehicle_id'       => '?integer',
    ];

    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    protected $validationRules = [
        'order_number'         => 'required|max_length[50]|is_unique[deliveries.order_number,id,{id}]',
        'customer_name'        => 'required|max_length[100]',
        'customer_phone'       => 'required|max_length[20]',
        'pickup_address'       => 'required',
        'destination_address'  => 'required',
        'package_description'  => 'permit_empty|max_length[255]',
        'package_weight'       => 'permit_empty|decimal|greater_than_equal_to[0]',
        'package_quantity'     => 'permit_empty|integer|greater_than[0]',
        'delivery_date'        => 'required|valid_date',
        'priority'             => 'permit_empty|in_list[low,normal,high,urgent]',
        'driver_id'            => 'permit_empty|is_natural_no_zero|is_not_unique[drivers.id]',
        'vehicle_id'           => 'permit_empty|is_natural_no_zero|is_not_unique[vehicles.id]',
        'status'               => 'permit_empty|in_list[pending,assigned,pickup,on_delivery,delivered,failed,cancelled]',
        'notes'                => 'permit_empty',
    ];

    protected $validationMessages = [
        'order_number' => [
            'is_unique' => 'Nomor order sudah digunakan',
        ],
        'driver_id' => [
            'is_not_unique' => 'Driver tidak ditemukan',
        ],
        'vehicle_id' => [
            'is_not_unique' => 'Kendaraan tidak ditemukan',
        ],
    ];

    /**
     * Generate nomor order otomatis: DO-YYYYMMDD-XXXX
     */
    public function generateOrderNumber(): string
    {
        $prefix = 'DO-' . date('Ymd') . '-';

        $last = $this->like('order_number', $prefix, 'after')
            ->orderBy('id', 'DESC')
            ->first();

        $nextNumber = 1;
        if ($last && preg_match('/(\d{4})$/', $last['order_number'], $m)) {
            $nextNumber = (int) $m[1] + 1;
        }

        return $prefix . str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Scope untuk pencarian dan filter.
     * PERBAIKAN: Menambahkan prefix 'deliveries.' untuk mencegah ambiguous column 
     * saat method ini dipanggil setelah withRelations() yang melakukan JOIN.
     */
    public function scopeSearchAndFilter(string $search = '', string $status = '', string $priority = '')
    {
        if ($search !== '') {
            $this->groupStart()
                ->like('deliveries.order_number', $search)
                ->orLike('deliveries.customer_name', $search)
                ->orLike('deliveries.customer_phone', $search)
                ->orLike('deliveries.pickup_address', $search)
                ->orLike('deliveries.destination_address', $search)
                ->groupEnd();
        }

        if ($status !== '') {
            $this->where('deliveries.status', $status); // FIX: Ditambahkan prefix tabel
        }

        if ($priority !== '') {
            $this->where('deliveries.priority', $priority); // FIX: Ditambahkan prefix tabel untuk konsistensi
        }

        return $this;
    }

    /**
     * Ambil data delivery beserta nama driver & kode kendaraan (join ringan).
     */
    public function withRelations()
    {
        return $this->select('deliveries.*, drivers.name as driver_name, vehicles.vehicle_code, vehicles.plate_number')
            ->join('drivers', 'drivers.id = deliveries.driver_id', 'left')
            ->join('vehicles', 'vehicles.id = deliveries.vehicle_id', 'left');
    }
}