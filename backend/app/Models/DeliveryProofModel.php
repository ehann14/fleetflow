<?php

namespace App\Models;

use CodeIgniter\Model;

class DeliveryProofModel extends Model
{
    protected $table            = 'delivery_proofs';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'delivery_id', 'recipient_name', 'photo_path', 'signature_path',
        'latitude', 'longitude', 'delivered_at', 'notes', 'submitted_by',
    ];

    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = ''; // bukti tidak pernah diubah

    public function existsForDelivery(int $deliveryId): bool
    {
        return $this->where('delivery_id', $deliveryId)->countAllResults() > 0;
    }

    /**
     * Bukti pengiriman + nama user yang men-submit.
     */
    public function findByDelivery(int $deliveryId): ?array
    {
        return $this->select('delivery_proofs.*, users.name AS submitted_by_name')
            ->join('users', 'users.id = delivery_proofs.submitted_by', 'left')
            ->where('delivery_proofs.delivery_id', $deliveryId)
            ->first();
    }
}