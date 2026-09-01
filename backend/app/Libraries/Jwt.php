<?php

namespace App\Libraries;

class Jwt
{
    public static function encode(array $payload): string
    {
        // Ambil secret key dari .env, jika kosong pakai fallback
        $key = env('JWT_SECRET') ?: 'super-secret-key-fleetflow-2024';
        $expiration = (int) (env('JWT_EXPIRATION') ?: 86400);

        $payload['iat'] = time();
        $payload['exp'] = time() + $expiration;
        
        // Gunakan FULLY QUALIFIED NAMESPACE (ada tanda \ di depan)
        // Ini mencegah autoloader bingung dengan class Jwt kita sendiri
        return \Firebase\JWT\JWT::encode($payload, $key, 'HS256');
    }

    public static function decode(string $token): ?object
    {
        try {
            $key = env('JWT_SECRET') ?: 'super-secret-key-fleetflow-2024';
            
            // Gunakan FULLY QUALIFIED NAMESPACE di sini juga
            return \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($key, 'HS256'));
        } catch (\Throwable $e) {
            // Jika token invalid/expired, kembalikan null
            log_message('error', 'JWT Decode Error: ' . $e->getMessage());
            return null;
        }
    }
}