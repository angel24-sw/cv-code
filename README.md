# Sistema de Ventas

Este repositorio ahora incluye un **sistema de ventas completo** en Python con:

- Gestión de productos (SKU, precio, stock).
- Gestión de clientes.
- Registro de ventas con control de inventario.
- Persistencia en JSON (`data/ventas_db.json`).
- Reporte de métricas (ventas, ingresos, unidades y ranking de productos).
- CLI para operar todo el flujo.

## Requisitos

- Python 3.10+

## Uso rápido

```bash
PYTHONPATH=src python -m sistema_ventas.cli nuevo-producto P001 "Laptop" 1200 10
PYTHONPATH=src python -m sistema_ventas.cli nuevo-cliente C001 "Ana" ana@email.com
PYTHONPATH=src python -m sistema_ventas.cli venta C001 P001:2
PYTHONPATH=src python -m sistema_ventas.cli resumen
```

## Comandos disponibles

- `nuevo-producto <sku> <nombre> <precio> <stock>`
- `nuevo-cliente <cliente_id> <nombre> <email>`
- `venta <cliente_id> <SKU:CANTIDAD ...>`
- `productos`
- `clientes`
- `ventas`
- `resumen`

## Pruebas

```bash
PYTHONPATH=src python -m unittest discover -s tests -v
```
