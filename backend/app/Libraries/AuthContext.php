<?php
// app/Libraries/AuthContext.php

namespace App\Libraries;

class AuthContext
{
    private static $user = null;

    public static function set($user): void
    {
        self::$user = $user;
    }

    public static function get()
    {
        return self::$user;
    }

    /**
     * Alias dari get(). Dipakai oleh AuthController, VehicleController,
     * DriverController, dan DeliveryController.
     */
    public static function user()
    {
        return self::$user;
    }

    public static function clear(): void
    {
        self::$user = null;
    }
}