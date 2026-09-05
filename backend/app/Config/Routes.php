<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'Home::index');

// API Routes
$routes->group('api', ['namespace' => 'App\Controllers\Api'], function($routes) {
    
    // Public route (tidak perlu login)
    $routes->post('auth/login', 'AuthController::login');

    // Protected routes (wajib login / ada token JWT)
    $routes->group('', ['filter' => 'jwtAuth'], function($routes) {
        
        // Auth
        $routes->get('auth/me', 'AuthController::me');
        $routes->post('auth/logout', 'AuthController::logout');

        // Dashboard
        $routes->get('dashboard/stats', 'DashboardController::stats');

        // Vehicles
        $routes->get('vehicles', 'VehicleController::index');
        $routes->post('vehicles', 'VehicleController::create');
        $routes->get('vehicles/(:num)', 'VehicleController::show/$1');
        $routes->put('vehicles/(:num)', 'VehicleController::update/$1');
        $routes->delete('vehicles/(:num)', 'VehicleController::delete/$1');

        // Drivers
        $routes->get('drivers', 'DriverController::index');
        $routes->post('drivers', 'DriverController::create');
        $routes->get('drivers/(:num)', 'DriverController::show/$1');
        $routes->put('drivers/(:num)', 'DriverController::update/$1');
        $routes->delete('drivers/(:num)', 'DriverController::delete/$1');

        // Deliveries
        $routes->get('deliveries', 'DeliveryController::index');
        $routes->post('deliveries', 'DeliveryController::create');
        $routes->get('deliveries/(:num)', 'DeliveryController::show/$1');
        $routes->put('deliveries/(:num)', 'DeliveryController::update/$1');
        $routes->post('deliveries/(:num)/assign', 'DeliveryController::assign/$1');
        
        // Route Baru (Update Status & History)
        $routes->post('deliveries/(:num)/status', 'DeliveryController::updateStatus/$1');
        $routes->get('deliveries/(:num)/history', 'DeliveryController::history/$1');
        
    });
});