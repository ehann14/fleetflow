<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateDeliveryProofTable extends Migration
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
            'delivery_id' => [
                'type'       => 'INT',
                'constraint' => 10,
                'unsigned'   => true,
            ],
            'recipient_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
            ],
            // Path relatif terhadap writable/uploads/ (file TIDAK di folder public)
            'photo_path' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
            ],
            'signature_path' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
            ],
            'latitude' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,7',
                'null'       => true,
            ],
            'longitude' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,7',
                'null'       => true,
            ],
            // Waktu barang diterima (dari device / default = waktu server)
            'delivered_at' => [
                'type' => 'DATETIME',
            ],
            'notes' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            // users.id yang men-submit bukti
            'submitted_by' => [
                'type'       => 'INT',
                'constraint' => 10,
                'unsigned'   => true,
                'null'       => true,
            ],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);

        $this->forge->addKey('id', true);
        // 1 delivery = maksimal 1 bukti pengiriman
        $this->forge->addUniqueKey('delivery_id');
        $this->forge->addForeignKey('delivery_id', 'deliveries', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('delivery_proofs', true);
    }

    public function down()
    {
        $this->forge->dropTable('delivery_proofs', true);
    }
}