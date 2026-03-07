<?php
session_start();

define('DB_PATH', __DIR__ . '/../database/ventas.sqlite');
define('UPLOAD_DIR', __DIR__ . '/uploads/');

if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0777, true);
}

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO('sqlite:' . DB_PATH);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }
    return $pdo;
}

function init_db(): void {
    $pdo = db();
    $schema = file_get_contents(__DIR__ . '/../database/schema.sql');
    $pdo->exec($schema);

    $exists = $pdo->query("SELECT COUNT(*) FROM usuarios")->fetchColumn();
    if ((int)$exists === 0) {
        $stmt = $pdo->prepare('INSERT INTO usuarios (nombre, email, password_hash) VALUES (:nombre, :email, :password_hash)');
        $stmt->execute([
            ':nombre' => 'Administrador',
            ':email' => 'admin@demo.com',
            ':password_hash' => password_hash('admin123', PASSWORD_DEFAULT)
        ]);
    }
}

function require_login(): void {
    if (!isset($_SESSION['user_id'])) {
        header('Location: login.php');
        exit;
    }
}

function current_user(): ?array {
    if (!isset($_SESSION['user_id'])) {
        return null;
    }

    $stmt = db()->prepare('SELECT * FROM usuarios WHERE id = :id');
    $stmt->execute([':id' => $_SESSION['user_id']]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

init_db();
