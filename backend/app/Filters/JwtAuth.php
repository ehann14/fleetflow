<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use App\Libraries\Jwt;

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

        $request->userData = $decoded;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        //
    }
}