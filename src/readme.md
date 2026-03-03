# Sistema Integral de Ventas y Cotizaciones

Sistema web con interfaz moderna para gestionar clientes, productos, ventas y cotizaciones.

## Incluye
- Login con sesión (`admin` / `123456`).
- CRM de clientes (RUC, razón social, teléfono, correo, dirección, imagen).
- Catálogo de productos con stock en tiempo real e imagen.
- Cotizaciones en **formato tabla profesional** con cálculo de cantidad x precio, descuento, IGV y total.
- Configuración de empresa con **logo**, datos de empresa y visualización del logo dentro de la cotización imprimible.
- Registro de ventas (Factura/Boleta), descuento automático de stock y estado de facturación electrónica.
- Reportes de ventas y stock bajo.
- Exportar/importar JSON y reset de base de datos local.

## Ejecutar
Desde la raíz del repo:

```bash
node --check src/app.js && python -m http.server 4173
```

Abrir:
- `http://127.0.0.1:4173/src/index.html`
