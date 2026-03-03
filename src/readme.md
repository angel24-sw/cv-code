# Sistema de Ventas Editable

Aplicación web local (sin backend) con base de datos editable usando `localStorage`.

## Qué puedes hacer
- Crear, editar y eliminar **clientes**.
- Crear, editar y eliminar **productos** con precio editable.
- Subir **imágenes** para clientes y productos.
- Registrar ventas y calcular automáticamente:
  - Subtotal
  - IGV (configurable en porcentaje)
  - Total
- Exportar/importar la base de datos en JSON.
- Reiniciar la base de datos local.

## Uso rápido
1. Abre `src/index.html` en tu navegador.
2. Registra clientes y productos.
3. Ve a “Comprobante de Venta” para emitir ventas.
4. Usa el bloque “Base de datos” para respaldo/restauración.

> Todos los datos se guardan en el navegador actual (`localStorage`).
