# Sistema de ventas con base de datos SQLite

Este proyecto incluye un sistema en Python para:
- Añadir clientes.
- Añadir productos y su precio.
- Registrar ventas (cliente + producto).
- Calcular de forma automática:
  - **Suma total** (subtotal)
  - **Promedio** de precios vendidos
  - **IGV (18%)**
  - **Total con IGV**

## Ejecutar

```bash
python3 src/sistema_gestion.py
```

La base de datos se crea automáticamente en `src/ventas.db`.
