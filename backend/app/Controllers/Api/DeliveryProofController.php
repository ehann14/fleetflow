<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\AuthContext;
use App\Models\DeliveryModel;
use App\Models\DeliveryProofModel;
use App\Models\DeliveryStatusHistoryModel;
use App\Models\DriverModel;
use CodeIgniter\HTTP\Files\UploadedFile;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Milestone 8 — Proof of Delivery
 *
 *  POST /api/deliveries/{id}/proof            kirim bukti (multipart/form-data atau JSON base64)
 *  GET  /api/deliveries/{id}/proof            lihat bukti
 *  GET  /api/deliveries/{id}/proof/photo      file foto      (butuh Authorization, ambil sebagai blob)
 *  GET  /api/deliveries/{id}/proof/signature  file tanda tangan
 *
 * Submit bukti = delivery otomatis menjadi 'delivered'.
 */
class DeliveryProofController extends BaseController
{
    private const MAX_FILE_BYTES      = 5242880; // 5 MB per file
    private const MAX_DIMENSION       = 12000;   // px
    private const FUTURE_SKEW_SECONDS = 300;

    /** mime hasil deteksi isi file (bukan dari nama/klien) => ekstensi */
    private const ALLOWED_MIMES = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
    ];

    protected $deliveryModel;
    protected $proofModel;

    /** Yang boleh MENGIRIM bukti. Driver hanya untuk delivery miliknya sendiri. */
    protected $submitRoles = ['admin', 'dispatcher', 'driver'];

    /** Yang boleh MELIHAT bukti. Driver hanya untuk delivery miliknya sendiri. */
    protected $readRoles = ['admin', 'dispatcher', 'manager', 'driver'];

    public function __construct()
    {
        $this->deliveryModel = new DeliveryModel();
        $this->proofModel    = new DeliveryProofModel();
    }

    // ------------------------------------------------------------------
    // POST /api/deliveries/{id}/proof
    // ------------------------------------------------------------------
    public function store($id = null)
    {
        if ($forbidden = $this->authorize($this->submitRoles)) return $forbidden;

        $id       = (int) $id;
        $delivery = $this->deliveryModel->find($id);

        if (!$delivery) {
            return $this->errorResponse(404, 'Delivery order tidak ditemukan');
        }

        if ($denied = $this->ensureOwnDelivery($delivery)) return $denied;

        if ($this->proofModel->existsForDelivery($id)) {
            return $this->errorResponse(409, 'Bukti pengiriman untuk delivery ini sudah pernah dikirim');
        }

        if ($delivery['status'] !== 'on_delivery') {
            return $this->errorResponse(
                422,
                "Bukti pengiriman hanya dapat dikirim saat status on_delivery (status saat ini: {$delivery['status']})",
                ['status' => ['Delivery harus berstatus on_delivery']]
            );
        }

        if (empty($delivery['driver_id']) || empty($delivery['vehicle_id'])) {
            return $this->errorResponse(422, 'Driver dan kendaraan belum ditugaskan pada delivery ini');
        }

        // --- baca input (multipart atau JSON) ---
        $input = $this->input();

        if (empty($input) && empty($this->request->getFiles())) {
            $length = (int) $this->request->getHeaderLine('Content-Length');

            return $length > 0
                ? $this->errorResponse(413, 'Ukuran request melebihi batas server. Periksa post_max_size & upload_max_filesize di php.ini (disarankan >= 12M)')
                : $this->errorResponse(400, 'Request body kosong. Kirim sebagai multipart/form-data atau application/json');
        }

        $errors = [];

        // recipient_name
        $recipient = isset($input['recipient_name']) && is_string($input['recipient_name'])
            ? trim($input['recipient_name'])
            : '';
        if ($recipient === '') {
            $errors['recipient_name'] = ['recipient_name wajib diisi'];
        } elseif (mb_strlen($recipient) < 2 || mb_strlen($recipient) > 100) {
            $errors['recipient_name'] = ['recipient_name harus 2 sampai 100 karakter'];
        } elseif (preg_match('/[\x00-\x1F\x7F]/', $recipient)) {
            $errors['recipient_name'] = ['recipient_name mengandung karakter tidak valid'];
        }

        // latitude / longitude (opsional, tapi harus berpasangan)
        $latitude = $longitude = null;
        $hasLat   = isset($input['latitude']) && $input['latitude'] !== '';
        $hasLng   = isset($input['longitude']) && $input['longitude'] !== '';

        if ($hasLat xor $hasLng) {
            $errors['latitude'] = ['latitude dan longitude harus diisi berpasangan'];
        } elseif ($hasLat && $hasLng) {
            if (!is_numeric($input['latitude']) || (float) $input['latitude'] < -90 || (float) $input['latitude'] > 90) {
                $errors['latitude'] = ['latitude harus angka antara -90 dan 90'];
            } else {
                $latitude = (float) $input['latitude'];
            }

            if (!is_numeric($input['longitude']) || (float) $input['longitude'] < -180 || (float) $input['longitude'] > 180) {
                $errors['longitude'] = ['longitude harus angka antara -180 dan 180'];
            } else {
                $longitude = (float) $input['longitude'];
            }
        }

        // delivered_at (opsional, default = sekarang)
        $deliveredAt = date('Y-m-d H:i:s');
        if (isset($input['delivered_at']) && $input['delivered_at'] !== '') {
            $dt = $this->parseTimestamp($input['delivered_at']);

            if ($dt === null) {
                $errors['delivered_at'] = ['delivered_at tidak valid. Gunakan "YYYY-MM-DD HH:MM:SS" atau ISO 8601 (mis. 2026-09-24T10:15:30Z)'];
            } elseif ($dt->getTimestamp() > time() + self::FUTURE_SKEW_SECONDS) {
                $errors['delivered_at'] = ['delivered_at tidak boleh di masa depan'];
            } else {
                $deliveredAt = $dt->format('Y-m-d H:i:s');
            }
        }

        // notes (opsional)
        $notes = null;
        if (isset($input['notes']) && $input['notes'] !== '') {
            if (!is_string($input['notes']) || mb_strlen($input['notes']) > 1000) {
                $errors['notes'] = ['notes maksimal 1000 karakter'];
            } else {
                $notes = trim($input['notes']);
            }
        }

        // photo & signature (wajib)
        [$photo, $photoError] = $this->extractImage('photo', 'Foto', $input);
        if ($photoError) $errors['photo'] = [$photoError];

        [$signature, $signatureError] = $this->extractImage('signature', 'Tanda tangan', $input);
        if ($signatureError) $errors['signature'] = [$signatureError];

        if (!empty($errors)) {
            return $this->errorResponse(400, 'Validasi gagal', $errors);
        }

        // --- simpan (transaksi) ---
        $user    = AuthContext::get();
        $userId  = isset($user->id) ? (int) $user->id : null;
        $db      = db_connect();
        $written = [];

        $db->transBegin();

        try {
            // Kunci baris delivery: mencegah 2 submit bersamaan
            $locked = $db->query('SELECT status FROM deliveries WHERE id = ? FOR UPDATE', [$id])->getRowArray();

            if (!$locked || $locked['status'] !== 'on_delivery' || $this->proofModel->existsForDelivery($id)) {
                $db->transRollback();

                return $this->errorResponse(409, 'Status delivery sudah berubah atau bukti sudah dikirim oleh proses lain. Muat ulang data delivery');
            }

            $photoPath     = $this->saveImage($photo, $id, 'photo');
            $written[]     = $photoPath;
            $signaturePath = $this->saveImage($signature, $id, 'signature');
            $written[]     = $signaturePath;

            $now = date('Y-m-d H:i:s');

            $proofId = $this->proofModel->insert([
                'delivery_id'    => $id,
                'recipient_name' => $recipient,
                'photo_path'     => $photoPath,
                'signature_path' => $signaturePath,
                'latitude'       => $latitude,
                'longitude'      => $longitude,
                'delivered_at'   => $deliveredAt,
                'notes'          => $notes,
                'submitted_by'   => $userId,
            ]);

            if ($proofId === false) {
                throw new \RuntimeException('Gagal menyimpan data bukti pengiriman');
            }

            // Delivery -> delivered
            $db->table('deliveries')->where('id', $id)->update([
                'status'     => 'delivered',
                'updated_at' => $now,
            ]);

            // Kendaraan -> available (hanya jika masih berstatus dipakai delivery ini)
            $db->table('vehicles')
                ->where('id', (int) $delivery['vehicle_id'])
                ->whereIn('status', ['assigned', 'on_delivery'])
                ->update(['status' => 'available', 'updated_at' => $now]);

            // Statistik driver (increment atomik di sisi database)
            $db->table('drivers')
                ->where('id', (int) $delivery['driver_id'])
                ->set('total_deliveries', 'total_deliveries + 1', false)
                ->set('completed_deliveries', 'completed_deliveries + 1', false)
                ->set('updated_at', $now)
                ->update();

            // History status
            $historyId = (new DeliveryStatusHistoryModel())->insert([
                'delivery_id' => $id,
                'from_status' => 'on_delivery',
                'to_status'   => 'delivered',
                'notes'       => 'Bukti pengiriman dikirim, diterima oleh ' . $recipient,
                'changed_by'  => $userId,
            ]);

            if ($historyId === false) {
                throw new \RuntimeException('Gagal menyimpan history status');
            }

            if ($db->transStatus() === false) {
                throw new \RuntimeException('Transaksi database gagal');
            }

            $db->transCommit();
        } catch (\Throwable $e) {
            $db->transRollback();

            foreach ($written as $relative) {
                @unlink($this->absolutePath($relative));
            }

            log_message('error', 'Proof submit error (delivery ' . $id . '): ' . $e->getMessage());

            return $this->errorResponse(500, 'Gagal menyimpan bukti pengiriman');
        }

        $proof    = $this->proofModel->findByDelivery($id);
        $delivery = $this->deliveryModel->find($id);

        return $this->response->setStatusCode(201)->setJSON([
            'success' => true,
            'message' => 'Bukti pengiriman berhasil disimpan. Status delivery menjadi delivered',
            'data'    => $this->formatProof($proof, $delivery),
        ]);
    }

    // ------------------------------------------------------------------
    // GET /api/deliveries/{id}/proof
    // ------------------------------------------------------------------
    public function show($id = null)
    {
        if ($forbidden = $this->authorize($this->readRoles)) return $forbidden;

        $id       = (int) $id;
        $delivery = $this->deliveryModel->find($id);

        if (!$delivery) {
            return $this->errorResponse(404, 'Delivery order tidak ditemukan');
        }

        if ($denied = $this->ensureOwnDelivery($delivery)) return $denied;

        $proof = $this->proofModel->findByDelivery($id);

        if (!$proof) {
            return $this->errorResponse(404, 'Belum ada bukti pengiriman untuk delivery ini');
        }

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Success',
            'data'    => $this->formatProof($proof, $delivery),
        ]);
    }

    // ------------------------------------------------------------------
    // GET /api/deliveries/{id}/proof/photo | /signature
    // ------------------------------------------------------------------
    public function photo($id = null)
    {
        return $this->serveFile((int) $id, 'photo_path');
    }

    public function signature($id = null)
    {
        return $this->serveFile((int) $id, 'signature_path');
    }

    private function serveFile(int $id, string $column)
    {
        if ($forbidden = $this->authorize($this->readRoles)) return $forbidden;

        $delivery = $this->deliveryModel->find($id);

        if (!$delivery) {
            return $this->errorResponse(404, 'Delivery order tidak ditemukan');
        }

        if ($denied = $this->ensureOwnDelivery($delivery)) return $denied;

        $proof = $this->proofModel->findByDelivery($id);

        if (!$proof) {
            return $this->errorResponse(404, 'Belum ada bukti pengiriman untuk delivery ini');
        }

        $path = $this->absolutePath($proof[$column]);

        if (!is_file($path)) {
            return $this->errorResponse(404, 'File tidak ditemukan di server');
        }

        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($path) ?: 'application/octet-stream';

        return $this->response
            ->setStatusCode(200)
            ->setHeader('Content-Type', $mime)
            ->setHeader('Content-Length', (string) filesize($path))
            ->setHeader('Content-Disposition', 'inline')
            ->setHeader('X-Content-Type-Options', 'nosniff')
            ->setHeader('Cache-Control', 'private, max-age=3600')
            ->setBody(file_get_contents($path));
    }

    // ------------------------------------------------------------------
    // Helper: otorisasi
    // ------------------------------------------------------------------
    private function authorize(array $allowedRoles)
    {
        $user = AuthContext::get();

        if (!$user || !in_array($user->role, $allowedRoles, true)) {
            return $this->errorResponse(403, 'Forbidden: Anda tidak memiliki akses untuk aksi ini');
        }

        return null;
    }

    /**
     * Role driver hanya boleh mengakses delivery yang ditugaskan kepadanya.
     * Akun driver dicocokkan ke tabel drivers lewat email (sama seperti Tracking M7).
     */
    private function ensureOwnDelivery(array $delivery)
    {
        $user = AuthContext::get();

        if ($user->role !== 'driver') {
            return null;
        }

        $me = (new DriverModel())->where('email', $user->email)->first();

        if (!$me) {
            return $this->errorResponse(403, 'Akun Anda belum terhubung ke data driver (email akun harus sama dengan email di data driver)');
        }

        if ((int) $delivery['driver_id'] !== (int) $me['id']) {
            return $this->errorResponse(403, 'Delivery ini bukan tugas Anda');
        }

        return null;
    }

    // ------------------------------------------------------------------
    // Helper: input & file
    // ------------------------------------------------------------------
    private function input(): array
    {
        $contentType = strtolower($this->request->getHeaderLine('Content-Type'));

        if (str_contains($contentType, 'application/json')) {
            try {
                $data = $this->request->getJSON(true);
            } catch (\Throwable $e) {
                $data = null;
            }

            return is_array($data) ? $data : [];
        }

        $post = $this->request->getPost();

        return is_array($post) ? $post : [];
    }

    /**
     * Ambil gambar dari upload file ATAU string base64 / data URL (dari canvas signature pad).
     * Tipe file ditentukan dari ISI file, bukan dari nama/ekstensi/header klien.
     *
     * @return array{0: ?array{bytes:string, ext:string}, 1: ?string} [gambar, pesan error]
     */
    private function extractImage(string $field, string $label, array $input): array
    {
        $bytes = null;
        $file  = $this->request->getFile($field);

        if ($file instanceof UploadedFile && $file->getError() !== UPLOAD_ERR_NO_FILE) {
            if (!$file->isValid()) {
                return [null, $this->uploadErrorMessage($label, $file->getError())];
            }

            if ($file->getSize() > self::MAX_FILE_BYTES) {
                return [null, "{$label} maksimal 5 MB"];
            }

            $bytes = @file_get_contents($file->getTempName());
        } elseif (isset($input[$field]) && is_string($input[$field]) && trim($input[$field]) !== '') {
            $raw = trim($input[$field]);

            // Buang prefix "data:image/png;base64," bila ada
            if (preg_match('#^data:[a-z0-9.+/-]+;base64,#i', substr($raw, 0, 100), $m)) {
                $raw = substr($raw, strlen($m[0]));
            }

            $raw = str_replace(["\r", "\n"], '', $raw);

            if (strlen($raw) > (int) ceil(self::MAX_FILE_BYTES * 4 / 3) + 8) {
                return [null, "{$label} maksimal 5 MB"];
            }

            $bytes = base64_decode($raw, true);
        } else {
            return [null, "{$label} wajib diisi"];
        }

        if ($bytes === false || $bytes === null || $bytes === '') {
            return [null, "{$label} tidak dapat dibaca (file rusak atau base64 tidak valid)"];
        }

        if (strlen($bytes) > self::MAX_FILE_BYTES) {
            return [null, "{$label} maksimal 5 MB"];
        }

        $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($bytes);

        if (!is_string($mime) || !isset(self::ALLOWED_MIMES[$mime])) {
            return [null, "{$label} harus berformat JPG, PNG, atau WebP"];
        }

        $info = @getimagesizefromstring($bytes);

        if ($info === false
            || $info[0] < 1 || $info[1] < 1
            || $info[0] > self::MAX_DIMENSION || $info[1] > self::MAX_DIMENSION
        ) {
            return [null, "{$label} bukan gambar yang valid atau dimensinya terlalu besar"];
        }

        return [['bytes' => $bytes, 'ext' => self::ALLOWED_MIMES[$mime]], null];
    }

    private function uploadErrorMessage(string $label, int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => "{$label} melebihi batas ukuran upload server (periksa upload_max_filesize di php.ini)",
            UPLOAD_ERR_PARTIAL                        => "{$label} hanya terunggah sebagian, coba lagi",
            default                                   => "{$label} gagal diunggah (kode {$code})",
        };
    }

    /**
     * Simpan ke writable/uploads/proofs/ dengan nama acak. Mengembalikan path relatif ("proofs/xxx.jpg").
     */
    private function saveImage(array $image, int $deliveryId, string $kind): string
    {
        $dir = WRITEPATH . 'uploads/proofs/';

        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException('Tidak dapat membuat folder penyimpanan bukti');
        }

        $name = $deliveryId . '-' . $kind . '-' . bin2hex(random_bytes(12)) . '.' . $image['ext'];

        if (file_put_contents($dir . $name, $image['bytes'], LOCK_EX) === false) {
            throw new \RuntimeException('Gagal menulis file ' . $kind);
        }

        return 'proofs/' . $name;
    }

    private function absolutePath(string $relative): string
    {
        // basename() = pengaman path traversal
        return WRITEPATH . 'uploads/proofs/' . basename($relative);
    }

    // ------------------------------------------------------------------
    // Helper: format response
    // ------------------------------------------------------------------

    /**
     * Struktur SAMA untuk POST dan GET proof.
     */
    private function formatProof(array $p, array $delivery): array
    {
        $id = (int) $p['delivery_id'];

        return [
            'id'             => (int) $p['id'],
            'delivery_id'    => $id,
            'recipient_name' => $p['recipient_name'],
            'photo_url'      => base_url("api/deliveries/{$id}/proof/photo"),
            'signature_url'  => base_url("api/deliveries/{$id}/proof/signature"),
            'latitude'       => $p['latitude'] !== null ? (float) $p['latitude'] : null,
            'longitude'      => $p['longitude'] !== null ? (float) $p['longitude'] : null,
            'delivered_at'   => $p['delivered_at'],
            'notes'          => $p['notes'],
            'submitted_by'   => $p['submitted_by'] !== null
                ? ['id' => (int) $p['submitted_by'], 'name' => $p['submitted_by_name'] ?? null]
                : null,
            'created_at'     => $p['created_at'],
            'delivery'       => [
                'id'                  => (int) $delivery['id'],
                'order_number'        => $delivery['order_number'],
                'status'              => $delivery['status'],
                'customer_name'       => $delivery['customer_name'],
                'destination_address' => $delivery['destination_address'],
                'driver_id'           => $delivery['driver_id'] !== null ? (int) $delivery['driver_id'] : null,
                'vehicle_id'          => $delivery['vehicle_id'] !== null ? (int) $delivery['vehicle_id'] : null,
            ],
        ];
    }

    private function errorResponse(int $status, string $message, array $errors = []): ResponseInterface
    {
        $body = ['success' => false, 'message' => $message];

        if (!empty($errors)) {
            $body['errors'] = $errors;
        }

        return $this->response->setStatusCode($status)->setJSON($body);
    }

    /**
     * Parse timestamp dari client (sama dengan TrackingController).
     * Diterima: "YYYY-MM-DD HH:MM:SS", ISO 8601 (Z / offset), atau epoch detik.
     * Tanpa offset -> dianggap zona waktu server (appTimezone).
     */
    private function parseTimestamp($value): ?\DateTimeImmutable
    {
        try {
            $tz = new \DateTimeZone(config('App')->appTimezone);

            if (is_int($value) || (is_string($value) && ctype_digit($value) && strlen($value) <= 10)) {
                return (new \DateTimeImmutable('@' . $value))->setTimezone($tz);
            }

            if (is_string($value)
                && preg_match('/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/', trim($value))
            ) {
                return (new \DateTimeImmutable(trim($value), $tz))->setTimezone($tz);
            }
        } catch (\Throwable $e) {
            // jatuh ke return null
        }

        return null;
    }
}