<?php
/**
 * BAZR — API: Guardar JSON
 * POST /api/save.php
 * Body: { "file": "data/orders.json", "data": [...] }
 *
 * SEGURIDAD:
 *  - Solo permite escribir archivos dentro de /data/
 *  - Requiere la misma clave de API en el header X-Admin-Key
 *  - Configura ADMIN_KEY con un valor secreto
 */

// ── Configuración ────────────────────────────────────────────────────
define('ADMIN_KEY', 'CAMBIA_ESTA_CLAVE_SECRETA');  // ← cambia esto
define('DATA_DIR',  __DIR__ . '/../data/');
define('ALLOWED_FILES', [
    'products.json',
    'categories.json',
    'orders.json',
    'payment_methods.json',
    'settings.json',
]);

// ── CORS / Headers ────────────────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')   { json_error(405, 'Method not allowed'); }

// ── Autenticación ─────────────────────────────────────────────────────
$key = $_SERVER['HTTP_X_ADMIN_KEY'] ?? '';
if ($key !== ADMIN_KEY) { json_error(401, 'Unauthorized'); }

// ── Leer body ────────────────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);
if (!$body || !isset($body['file']) || !isset($body['data'])) {
    json_error(400, 'Bad request: missing file or data');
}

$filename = basename($body['file']);
if (!in_array($filename, ALLOWED_FILES)) {
    json_error(403, 'Forbidden: file not allowed');
}

// ── Escribir ──────────────────────────────────────────────────────────
$path = DATA_DIR . $filename;
$json = json_encode($body['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

if ($json === false) { json_error(500, 'JSON encode error'); }

if (file_put_contents($path, $json, LOCK_EX) === false) {
    json_error(500, 'Could not write file: ' . $filename);
}

echo json_encode(['ok' => true, 'file' => $filename]);
exit;

function json_error($code, $msg) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}
