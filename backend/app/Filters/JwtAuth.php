<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use App\Libraries\Jwt;
use App\Libraries\AuthContext;

class JwtAuth implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $header = $request->getHeaderLine('Authorization');

        if (!$header || !str_starts_with($header, 'Bearer ')) {
            return service('response')->setStatusCode(401)
                ->setJSON(['success' => false, 'message' => 'Unauthorized: Token missing']);
        }

        $token = substr($header, 7);
        $decoded = Jwt::decode($token);

        if (!$decoded) {
            return service('response')->setStatusCode(401)
                ->setJSON(['success' => false, 'message' => 'Unauthorized: Invalid or expired token']);
        }

        // Dulu: $request->userData = $decoded; (dynamic property, deprecated di PHP 8.2+)
        AuthContext::set($decoded);
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Bersihkan agar tidak "bocor" antar request pada worker long-lived (mis. Swoole/RoadRunner).
        // Aman/no-op untuk PHP-FPM standar, tapi jadi jaring pengaman kalau runtime-nya berubah.
        AuthContext::clear();
    }
}