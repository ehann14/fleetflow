<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateDeliveryStatusHistoryTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'delivery_id' => [
                'type'       => 'INT',
                'constraint' => 10,
                'unsigned'   => true,
            ],
            'from_status' => [
                'type'       => 'VARCHAR',
                'constraint' => '20',
                'null'       => true,
            ],
            'to_status' => [
                'type'       => 'VARCHAR',
                'constraint' => '20',
            ],
            'notes' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'changed_by' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
            ],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addKey('delivery_id');
        $this->forge->addForeignKey('delivery_id', 'deliveries', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('delivery_status_histories');
    }

    public function down()
    {
        $this->forge->dropTable('delivery_status_histories');
    }
}