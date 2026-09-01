<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run()
    {
        $data = [
            [
                'name'       => 'Super Admin',
                'email'      => 'admin@fleetflow.com',
                'password'   => password_hash('password', PASSWORD_BCRYPT),
                'role'       => 'admin',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
            [
                'name'       => 'John Dispatcher',
                'email'      => 'dispatcher@fleetflow.com',
                'password'   => password_hash('password', PASSWORD_BCRYPT),
                'role'       => 'dispatcher',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
            [
                'name'       => 'Mike Driver',
                'email'      => 'driver@fleetflow.com',
                'password'   => password_hash('password', PASSWORD_BCRYPT),
                'role'       => 'driver',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
            [
                'name'       => 'Sarah Manager',
                'email'      => 'manager@fleetflow.com',
                'password'   => password_hash('password', PASSWORD_BCRYPT),
                'role'       => 'manager',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
        ];

        $this->db->table('users')->insertBatch($data);
    }
}