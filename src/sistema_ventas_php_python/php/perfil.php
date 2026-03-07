<?php
require_once __DIR__ . '/partials.php';
require_login();
$pdo = db();
$user = current_user();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nombre = trim($_POST['nombre'] ?? $user['nombre']);

    $foto = $user['foto_perfil'];
    if (!empty($_FILES['foto_perfil']['name'])) {
        $foto = uniqid('foto_') . '_' . basename($_FILES['foto_perfil']['name']);
        move_uploaded_file($_FILES['foto_perfil']['tmp_name'], UPLOAD_DIR . $foto);
    }

    $logo = $user['logo_empresa'];
    if (!empty($_FILES['logo_empresa']['name'])) {
        $logo = uniqid('logo_') . '_' . basename($_FILES['logo_empresa']['name']);
        move_uploaded_file($_FILES['logo_empresa']['tmp_name'], UPLOAD_DIR . $logo);
    }

    $stmt = $pdo->prepare('UPDATE usuarios SET nombre = :nombre, foto_perfil = :foto_perfil, logo_empresa = :logo_empresa WHERE id = :id');
    $stmt->execute([
        ':nombre' => $nombre,
        ':foto_perfil' => $foto,
        ':logo_empresa' => $logo,
        ':id' => $_SESSION['user_id']
    ]);

    header('Location: perfil.php');
    exit;
}

$user = current_user();
render_header('Perfil');
?>
<h1>Perfil y marca</h1>
<form class="card" method="post" enctype="multipart/form-data">
    <label>Nombre<input name="nombre" value="<?= htmlspecialchars($user['nombre']) ?>"></label>
    <label>Foto de perfil<input type="file" name="foto_perfil" accept="image/*"></label>
    <label>Logo empresa<input type="file" name="logo_empresa" accept="image/*"></label>
    <button type="submit">Guardar perfil</button>
</form>
<?php if (!empty($user['foto_perfil'])): ?>
    <p>Foto actual:</p>
    <img class="avatar" src="uploads/<?= htmlspecialchars($user['foto_perfil']) ?>" alt="foto perfil">
<?php endif; ?>
<?php render_footer(); ?>
