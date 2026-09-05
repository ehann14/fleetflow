<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateVehicleTable extends Migration
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
            'vehicle_code' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
                'unique'     => true,
            ],
            'plate_number' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,
                'unique'     => true,
            ],
            'brand' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
            ],
            'model' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
            ],
            'type' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
            ],
            'year' => [
                'type'       => 'INT',
                'constraint' => 4,
            ],
            'capacity' => [
                'type'       => 'INT',
                'constraint' => 11,
            ],
            'fuel_type' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
            ],
            'current_mileage' => [
                'type'       => 'INT',
                'constraint' => 11,
                'default'    => 0,
            ],
            'status' => [
                'type'       => 'ENUM',
                'constraint' => ['available', 'assigned', 'on_delivery', 'maintenance', 'inactive'],
                'default'    => 'available',
            ],
            'last_service' => [
                'type' => 'DATE',
                'null' => true,
            ],
            'next_service' => [
                'type' => 'DATE',
                'null' => true,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->createTable('vehicles');
    }

    public function down()
    {
        $this->forge->dropTable('vehicles');
    }
}