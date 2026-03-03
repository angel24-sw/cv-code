# Sistema Integral de Ventas y Cotizaciones

Incluye login, CRM, productos con stock en tiempo real, cotizaciones, ventas, reportes y respaldo local.

## Módulos
- **Login y seguridad:** acceso por usuario (`admin` / `123456`) y cierre de sesión.
- **CRM Clientes:** RUC, razón social, teléfono, correo, dirección e imagen.
- **Productos:** código, nombre, precio, stock en tiempo real e imagen.
- **Cotizaciones:** jala precios de productos automáticamente, calcula cantidad x precio, descuento, IGV, total, estado (borrador/enviado/aprobado/rechazado) e impresión.
- **Ventas:** registra comprobantes (Factura/Boleta), descuenta stock y marca estado de facturación electrónica (`Emitido`).
- **Reportes:** ventas acumuladas, total cotizaciones, aprobadas y alertas de stock bajo.
- **Soporte local:** exportar/importar JSON y reinicio de base de datos.

## Ejecutar
Desde la raíz del repo:

```bash
node --check src/app.js && python -m http.server 4173
```

Luego abre:
- `http://127.0.0.1:4173/src/index.html`
