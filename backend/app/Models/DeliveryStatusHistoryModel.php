<?php

namespace App\Models;

use CodeIgniter\Model;

class DeliveryStatusHistoryModel extends Model
{
    protected $table            = 'delivery_status_histories';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = ['delivery_id', 'from_status', 'to_status', 'notes', 'changed_by'];

    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = null; // history tidak pernah diupdate
}