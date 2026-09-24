<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateVehicleLocationTables extends Migration
{
    public function up()
    {
        /*
         * 1) vehicle_locations = RIWAYAT seluruh titik GPS (append-only).
         *    Dipakai untuk polyline / jejak perjalanan.
         */
        $this->forge->addField([
            'id' => [
                'type'           => 'BIGINT',
                'constraint'     => 20,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'vehicle_id' => [
                'type'       => 'INT',
                'constraint' => 10,
                'unsigned'   => true,
            ],
            'driver_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
            ],
            'latitude' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,7',
            ],
            'longitude' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,7',
            ],
            // km/jam
            'speed' => [
                'type'       => 'DECIMAL',
                'constraint' => '6,2',
                'unsigned'   => true,
                'default'    => 0,
            ],
            // waktu titik GPS diambil (dikirim device), zona waktu = appTimezone
            'recorded_at' => [
                'type' => 'DATETIME',
            ],
            // waktu server menerima data
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addKey(['vehicle_id', 'recorded_at']);
        $this->forge->addKey('driver_id');
        $this->forge->addForeignKey('vehicle_id', 'vehicles', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('driver_id', 'drivers', 'id', 'CASCADE', 'SET NULL');
        $this->forge->createTable('vehicle_locations', true);

        /*
         * 2) vehicle_last_locations = LOKASI TERAKHIR, tepat 1 baris per kendaraan.
         *    Dipakai GET /api/tracking supaya polling peta cepat
         *    (tidak perlu scan tabel riwayat yang terus membesar).
         */
        $this->forge->addField([
            'vehicle_id' => [
                'type'       => 'INT',
                'constraint' => 10,
                'unsigned'   => true,
            ],
            'driver_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
            ],
            'latitude' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,7',
            ],
            'longitude' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,7',
            ],
            'speed' => [
                'type'       => 'DECIMAL',
                'constraint' => '6,2',
                'unsigned'   => true,
                'default'    => 0,
            ],
            'recorded_at' => [
                'type' => 'DATETIME',
            ],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);

        $this->forge->addKey('vehicle_id', true);
        $this->forge->addKey('recorded_at');
        $this->forge->addForeignKey('vehicle_id', 'vehicles', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('driver_id', 'drivers', 'id', 'CASCADE', 'SET NULL');
        $this->forge->createTable('vehicle_last_locations', true);
    }

    public function down()
    {
        $this->forge->dropTable('vehicle_last_locations', true);
        $this->forge->dropTable('vehicle_locations', true);
    }
}