<?php
require_once __DIR__ . '/partials.php';
require_login();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $stmt = $pdo->prepare('INSERT INTO productos (nombre, descripcion, precio, stock) VALUES (:nombre, :descripcion, :precio, :stock)');
    $stmt->execute([
        ':nombre' => trim($_POST['nombre'] ?? ''),
        ':descripcion' => trim($_POST['descripcion'] ?? ''),
        ':precio' => (float)($_POST['precio'] ?? 0),
        ':stock' => (int)($_POST['stock'] ?? 0)
    ]);
    header('Location: productos.php');
    exit;
}

$productos = $pdo->query('SELECT * FROM productos ORDER BY id DESC')->fetchAll(PDO::FETCH_ASSOC);
render_header('Productos');
?>
<h1>Productos y stock</h1>
<form class="card" method="post">
    <h2>Nuevo producto</h2>
    <label>Nombre<input name="nombre" required></label>
    <label>Descripción<textarea name="descripcion"></textarea></label>
    <label>Precio<input type="number" step="0.01" name="precio" required></label>
    <label>Stock<input type="number" name="stock" required></label>
    <button type="submit">Guardar producto</button>
</form>
<table>
    <thead><tr><th>ID</th><th>Nombre</th><th>Precio</th><th>Stock</th></tr></thead>
    <tbody>
    <?php foreach ($productos as $p): ?>
        <tr>
            <td><?= $p['id'] ?></td>
            <td><?= htmlspecialchars($p['nombre']) ?></td>
            <td>$<?= number_format((float)$p['precio'], 2) ?></td>
            <td><?= $p['stock'] ?></td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>
<?php render_footer(); ?>
