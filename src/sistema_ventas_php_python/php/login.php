<?php
require_once __DIR__ . '/config.php';

if (isset($_SESSION['user_id'])) {
    header('Location: dashboard.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    $stmt = db()->prepare('SELECT * FROM usuarios WHERE email = :email');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['user_id'] = $user['id'];
        header('Location: dashboard.php');
        exit;
    }
    $error = 'Credenciales inválidas';
}
?>
<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Login - Sistema de Ventas</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body class="auth-body">
<form class="card" method="post">
    <h1>Iniciar sesión</h1>
    <p>Demo: admin@demo.com / admin123</p>
    <?php if ($error): ?><p class="error"><?= htmlspecialchars($error) ?></p><?php endif; ?>
    <label>Email<input type="email" name="email" required></label>
    <label>Contraseña<input type="password" name="password" required></label>
    <button type="submit">Entrar</button>
</form>
</body>
</html>
