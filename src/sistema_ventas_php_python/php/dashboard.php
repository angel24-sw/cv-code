<?php
require_once __DIR__ . '/partials.php';
require_login();

$pdo = db();
$stats = [
    'clientes' => (int)$pdo->query('SELECT COUNT(*) FROM clientes')->fetchColumn(),
    'productos' => (int)$pdo->query('SELECT COUNT(*) FROM productos')->fetchColumn(),
    'cotizaciones' => (int)$pdo->query('SELECT COUNT(*) FROM cotizaciones')->fetchColumn(),
    'ventas_estimadas' => (float)$pdo->query("SELECT COALESCE(SUM(total),0) FROM cotizaciones WHERE estado = 'aprobada'")->fetchColumn()
];

render_header('Dashboard');
?>
<h1>Sistema de ventas completo</h1>
<section class="grid">
    <article class="card"><h2>Clientes</h2><p><?= $stats['clientes'] ?></p></article>
    <article class="card"><h2>Productos</h2><p><?= $stats['productos'] ?></p></article>
    <article class="card"><h2>Cotizaciones</h2><p><?= $stats['cotizaciones'] ?></p></article>
    <article class="card"><h2>Ventas estimadas</h2><p>$<?= number_format($stats['ventas_estimadas'], 2) ?></p></article>
</section>
<?php render_footer(); ?>
