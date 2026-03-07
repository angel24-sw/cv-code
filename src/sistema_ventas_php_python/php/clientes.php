<?php
require_once __DIR__ . '/partials.php';
require_login();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $stmt = $pdo->prepare('INSERT INTO clientes (nombre, email, telefono, direccion) VALUES (:nombre, :email, :telefono, :direccion)');
    $stmt->execute([
        ':nombre' => trim($_POST['nombre'] ?? ''),
        ':email' => trim($_POST['email'] ?? ''),
        ':telefono' => trim($_POST['telefono'] ?? ''),
        ':direccion' => trim($_POST['direccion'] ?? '')
    ]);
    header('Location: clientes.php');
    exit;
}

$clientes = $pdo->query('SELECT * FROM clientes ORDER BY id DESC')->fetchAll(PDO::FETCH_ASSOC);
render_header('Clientes');
?>
<h1>Clientes</h1>
<form class="card" method="post">
    <h2>Nuevo cliente</h2>
    <label>Nombre<input name="nombre" required></label>
    <label>Email<input type="email" name="email"></label>
    <label>Teléfono<input name="telefono"></label>
    <label>Dirección<textarea name="direccion"></textarea></label>
    <button type="submit">Guardar cliente</button>
</form>
<table>
    <thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Teléfono</th></tr></thead>
    <tbody>
    <?php foreach ($clientes as $c): ?>
        <tr>
            <td><?= $c['id'] ?></td>
            <td><?= htmlspecialchars($c['nombre']) ?></td>
            <td><?= htmlspecialchars($c['email']) ?></td>
            <td><?= htmlspecialchars($c['telefono']) ?></td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>
<?php render_footer(); ?>
