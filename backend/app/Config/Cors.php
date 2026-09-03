<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

/**
 * Cross-Origin Resource Sharing (CORS) Configuration
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 */
class Cors extends BaseConfig
{
    /**
     * The default CORS configuration.
     *
     * @var array{
     *      allowedOrigins: list<string>,
     *      allowedOriginsPatterns: list<string>,
     *      supportsCredentials: bool,
     *      allowedHeaders: list<string>,
     *      exposedHeaders: list<string>,
     *      allowedMethods: list<string>,
     *      maxAge: int,
     *  }
     */
    public array $default = [
        'allowedOrigins' => [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
        ],

        'allowedOriginsPatterns' => [],

        'supportsCredentials' => false,

        'allowedHeaders' => [
            'Content-Type',
            'Authorization',
            'Accept',
            'X-Requested-With',
        ],

        'exposedHeaders' => [],

        'allowedMethods' => [
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'DELETE',
            'OPTIONS',
        ],

        'maxAge' => 7200,
    ];
}