<?php

namespace App\Libraries;

/**
 * Menyimpan data user hasil decode JWT untuk request yang sedang berjalan.
 *
 * Menggantikan pola `$request->userData = $decoded;` yang sebelumnya dipakai
 * di JwtAuth.php. Pola lama itu menulis property dinamis ke object
 * IncomingRequest bawaan CodeIgniter yang TIDAK mendeklarasikan property
 * `userData` — ini memicu "Deprecated: Creation of dynamic property" di
 * PHP 8.2+, dan berpotensi jadi fatal error jika class tersebut nanti
 * ditandai #[AllowDynamicProperties(false)] oleh framework/PHP di masa depan.
 *
 * Static property di sini aman karena satu request PHP (PHP-FPM/CLI)
 * hanya menangani satu request pada satu waktu (tidak ada shared state
 * antar-request seperti di runtime long-lived/async).
 */
class AuthContext
{
    private static ?object $user = null;

    public static function set(object $decoded): void
    {
        self::$user = $decoded;
    }

    public static function user(): ?object
    {
        return self::$user;
    }

    public static function clear(): void
    {
        self::$user = null;
    }
}