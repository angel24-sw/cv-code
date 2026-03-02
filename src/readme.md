# Sistema de Ventas Editable

Aplicación web simple (sin backend) que usa `localStorage` como base de datos editable.

## Funcionalidades
- Gestión de **clientes** (crear, editar, eliminar).
- Gestión de **productos** (crear, editar, eliminar, precio editable).
- Registro de ventas con cálculo automático de:
  - Subtotal
  - IGV (18%)
  - Total
- Carga de imágenes para clientes y productos.

## Uso
1. Abrir `src/index.html` en el navegador.
2. Registrar clientes y productos.
3. Crear comprobantes desde la sección “Comprobante de Venta”.

> Los datos quedan guardados en el navegador actual mediante `localStorage`.
