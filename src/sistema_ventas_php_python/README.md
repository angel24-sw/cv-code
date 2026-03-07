# Sistema de ventas (PHP + Python)

Este módulo implementa un sistema completo base para:

- Login de usuarios.
- Gestión de productos y stock.
- Gestión de clientes.
- Cotizaciones con múltiples productos (hasta 2 líneas rápidas por formulario, expandible).
- Perfil de usuario con foto y logo de empresa.
- Reportes en Python leyendo la misma base de datos SQLite.

## Estructura

- `php/`: aplicación web en PHP.
- `database/schema.sql`: modelo de datos.
- `python/reportes.py`: script de reportes.

## Ejecutar (desarrollo)

```bash
cd src/sistema_ventas_php_python/php
php -S 0.0.0.0:8000
```

Luego abre `http://localhost:8000`.

Usuario demo:

- Email: `admin@demo.com`
- Contraseña: `admin123`

## Reporte en Python

```bash
python3 src/sistema_ventas_php_python/python/reportes.py
```

## Mejoras recomendadas para producción

1. Migrar de SQLite a MySQL o PostgreSQL.
2. Agregar control de roles (admin/vendedor).
3. Generar cotizaciones PDF e historial por cliente.
4. Validar tamaño/tipo de imágenes subidas.
5. Agregar pruebas automáticas y CSRF tokens.
