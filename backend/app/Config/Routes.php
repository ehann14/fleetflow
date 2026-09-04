<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'Home::index');

// API Routes
$routes->group('api', ['namespace' => 'App\Controllers\Api'], function($routes) {
    $routes->post('auth/login', 'AuthController::login');

    $routes->group('', ['filter' => 'jwtAuth'], function($routes) {
        $routes->get('auth/me', 'AuthController::me');
        $routes->post('auth/logout', 'AuthController::logout');

        // Vehicles
        $routes->get('vehicles', 'VehicleController::index');
        $routes->post('vehicles', 'VehicleController::create');
        $routes->get('vehicles/(:num)', 'VehicleController::show/$1');
        $routes->put('vehicles/(:num)', 'VehicleController::update/$1');
        $routes->delete('vehicles/(:num)', 'VehicleController::delete/$1');
    });
});