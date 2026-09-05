<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateDeliveryTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 10,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'order_number' => [
                'type'       => 'VARCHAR',
                'constraint' => '50',
                'unique'     => true,
            ],
            'customer_name' => [
                'type'       => 'VARCHAR',
                'constraint' => '100',
            ],
            'customer_phone' => [
                'type'       => 'VARCHAR',
                'constraint' => '20',
            ],
            'pickup_address' => [
                'type' => 'TEXT',
            ],
            'destination_address' => [
                'type' => 'TEXT',
            ],
            'package_description' => [
                'type'       => 'VARCHAR',
                'constraint' => '255',
                'null'       => true,
            ],
            'package_weight' => [
                'type'       => 'DECIMAL',
                'constraint' => '8,2',
                'unsigned'   => true,
                'default'    => 0,
            ],
            'package_quantity' => [
                'type'       => 'INT',
                'constraint' => 10,
                'unsigned'   => true,
                'default'    => 1,
            ],
            'delivery_date' => [
                'type' => 'DATE',
            ],
            'priority' => [
                'type'       => 'ENUM',
                'constraint' => ['low', 'normal', 'high', 'urgent'],
                'default'    => 'normal',
            ],
            'driver_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
            ],
            'vehicle_id' => [
                'type'       => 'INT',
                'constraint' => 10,
                'unsigned'   => true,
                'null'       => true,
            ],
            'status' => [
                'type'       => 'ENUM',
                'constraint' => ['pending', 'assigned', 'pickup', 'on_delivery', 'delivered', 'failed', 'cancelled'],
                'default'    => 'pending',
            ],
            'notes' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addKey('status');
        $this->forge->addKey('driver_id');
        $this->forge->addKey('vehicle_id');
        $this->forge->addForeignKey('driver_id', 'drivers', 'id', 'CASCADE', 'SET NULL');
        $this->forge->addForeignKey('vehicle_id', 'vehicles', 'id', 'CASCADE', 'SET NULL');
        $this->forge->createTable('deliveries');
    }

    public function down()
    {
        $this->forge->dropTable('deliveries');
    }
}