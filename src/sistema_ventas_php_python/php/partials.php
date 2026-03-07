<?php
require_once __DIR__ . '/config.php';

function render_header(string $title): void {
    $user = current_user();
    echo '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<title>' . htmlspecialchars($title) . '</title>';
    echo '<link rel="stylesheet" href="assets/style.css">';
    echo '</head><body>';
    echo '<header class="topbar">';
    if ($user && !empty($user['logo_empresa'])) {
        echo '<img class="logo" src="uploads/' . htmlspecialchars($user['logo_empresa']) . '" alt="Logo">';
    } else {
        echo '<div class="logo placeholder">Mi Empresa</div>';
    }
    echo '<nav>';
    echo '<a href="dashboard.php">Dashboard</a><a href="productos.php">Productos</a><a href="clientes.php">Clientes</a><a href="cotizaciones.php">Cotizaciones</a><a href="perfil.php">Perfil</a><a href="logout.php">Salir</a>';
    echo '</nav>';
    echo '</header><main class="container">';
}

function render_footer(): void {
    echo '</main></body></html>';
}
