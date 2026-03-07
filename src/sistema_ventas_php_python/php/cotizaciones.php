<?php
require_once __DIR__ . '/partials.php';
require_login();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $clienteId = (int)($_POST['cliente_id'] ?? 0);
    $impuestos = (float)($_POST['impuestos'] ?? 0);
    $estado = $_POST['estado'] ?? 'borrador';
    $productoIds = $_POST['producto_id'] ?? [];
    $cantidades = $_POST['cantidad'] ?? [];

    $subtotal = 0;
    $lineas = [];
    foreach ($productoIds as $idx => $productoId) {
        $productoId = (int)$productoId;
        $cantidad = max(1, (int)($cantidades[$idx] ?? 1));
        if ($productoId <= 0) {
            continue;
        }
        $stmt = $pdo->prepare('SELECT id, precio, stock FROM productos WHERE id = :id');
        $stmt->execute([':id' => $productoId]);
        $producto = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$producto || (int)$producto['stock'] < $cantidad) {
            continue;
        }
        $total = $cantidad * (float)$producto['precio'];
        $subtotal += $total;
        $lineas[] = ['producto_id' => $productoId, 'cantidad' => $cantidad, 'precio' => (float)$producto['precio'], 'total' => $total];
    }

    if ($clienteId > 0 && count($lineas) > 0) {
        $total = $subtotal + $impuestos;
        $stmt = $pdo->prepare('INSERT INTO cotizaciones (cliente_id, usuario_id, subtotal, impuestos, total, estado) VALUES (:cliente_id, :usuario_id, :subtotal, :impuestos, :total, :estado)');
        $stmt->execute([
            ':cliente_id' => $clienteId,
            ':usuario_id' => $_SESSION['user_id'],
            ':subtotal' => $subtotal,
            ':impuestos' => $impuestos,
            ':total' => $total,
            ':estado' => $estado
        ]);
        $cotizacionId = (int)$pdo->lastInsertId();

        $itemStmt = $pdo->prepare('INSERT INTO cotizacion_items (cotizacion_id, producto_id, cantidad, precio_unitario, total) VALUES (:cotizacion_id, :producto_id, :cantidad, :precio_unitario, :total)');
        $stockStmt = $pdo->prepare('UPDATE productos SET stock = stock - :cantidad WHERE id = :id');
        foreach ($lineas as $linea) {
            $itemStmt->execute([
                ':cotizacion_id' => $cotizacionId,
                ':producto_id' => $linea['producto_id'],
                ':cantidad' => $linea['cantidad'],
                ':precio_unitario' => $linea['precio'],
                ':total' => $linea['total']
            ]);
            $stockStmt->execute([':cantidad' => $linea['cantidad'], ':id' => $linea['producto_id']]);
        }
    }

    header('Location: cotizaciones.php');
    exit;
}

$clientes = $pdo->query('SELECT id, nombre FROM clientes ORDER BY nombre')->fetchAll(PDO::FETCH_ASSOC);
$productos = $pdo->query('SELECT id, nombre, precio, stock FROM productos ORDER BY nombre')->fetchAll(PDO::FETCH_ASSOC);
$cotizaciones = $pdo->query('SELECT c.id, cl.nombre AS cliente, c.total, c.estado, c.created_at FROM cotizaciones c JOIN clientes cl ON cl.id = c.cliente_id ORDER BY c.id DESC')->fetchAll(PDO::FETCH_ASSOC);
render_header('Cotizaciones');
?>
<h1>Cotizaciones</h1>
<form class="card" method="post">
    <h2>Nueva cotización</h2>
    <label>Cliente
        <select name="cliente_id" required>
            <option value="">Selecciona cliente</option>
            <?php foreach ($clientes as $cliente): ?>
                <option value="<?= $cliente['id'] ?>"><?= htmlspecialchars($cliente['nombre']) ?></option>
            <?php endforeach; ?>
        </select>
    </label>
    <div class="grid two">
        <label>Producto 1
            <select name="producto_id[]">
                <option value="">Selecciona producto</option>
                <?php foreach ($productos as $producto): ?>
                    <option value="<?= $producto['id'] ?>"><?= htmlspecialchars($producto['nombre']) ?> (stock: <?= $producto['stock'] ?>)</option>
                <?php endforeach; ?>
            </select>
        </label>
        <label>Cantidad 1<input type="number" name="cantidad[]" min="1" value="1"></label>
        <label>Producto 2
            <select name="producto_id[]">
                <option value="">Selecciona producto</option>
                <?php foreach ($productos as $producto): ?>
                    <option value="<?= $producto['id'] ?>"><?= htmlspecialchars($producto['nombre']) ?> (stock: <?= $producto['stock'] ?>)</option>
                <?php endforeach; ?>
            </select>
        </label>
        <label>Cantidad 2<input type="number" name="cantidad[]" min="1" value="1"></label>
    </div>
    <label>Impuestos<input type="number" step="0.01" name="impuestos" value="0"></label>
    <label>Estado
        <select name="estado">
            <option value="borrador">Borrador</option>
            <option value="enviada">Enviada</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
        </select>
    </label>
    <button type="submit">Guardar cotización</button>
</form>

<table>
    <thead><tr><th>ID</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead>
    <tbody>
    <?php foreach ($cotizaciones as $cotizacion): ?>
        <tr>
            <td><?= $cotizacion['id'] ?></td>
            <td><?= htmlspecialchars($cotizacion['cliente']) ?></td>
            <td>$<?= number_format((float)$cotizacion['total'], 2) ?></td>
            <td><?= htmlspecialchars($cotizacion['estado']) ?></td>
            <td><?= htmlspecialchars($cotizacion['created_at']) ?></td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>
<?php render_footer(); ?>
