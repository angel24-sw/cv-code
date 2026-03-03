# Sistema de Ventas Editable

Aplicación web local (sin backend) con base de datos editable usando `localStorage`.

## Qué puedes hacer
- Login de acceso al sistema.
- Crear, editar y eliminar **clientes**.
- Crear, editar y eliminar **productos** con precio editable.
- Subir **imágenes** para clientes y productos.
- Registrar ventas y calcular automáticamente Subtotal, IGV y Total.
- Crear **cotizaciones tipo formato profesional** (ítems, descuentos, vigencia, moneda, observaciones e impresión).
- Exportar/importar la base de datos en JSON.
- Reiniciar la base de datos local.

## Credenciales por defecto
- Usuario: `admin`
- Contraseña: `123456`

## Uso rápido
1. Abre `src/index.html` en tu navegador.
2. Inicia sesión.
3. Registra clientes y productos.
4. Emite ventas y cotizaciones.
5. Usa “Base de datos” para respaldo/restauración.

## Verificación local
Ejecuta desde la raíz del repo:

```bash
node --check src/app.js && python -m http.server 4173
```
