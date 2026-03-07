#!/usr/bin/env python3
"""Reportes para el sistema de ventas (usa la misma base SQLite del módulo PHP)."""
from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "database" / "ventas.sqlite"


def resumen_general() -> dict:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    metrics = {
        "clientes": cur.execute("SELECT COUNT(*) FROM clientes").fetchone()[0],
        "productos": cur.execute("SELECT COUNT(*) FROM productos").fetchone()[0],
        "cotizaciones": cur.execute("SELECT COUNT(*) FROM cotizaciones").fetchone()[0],
        "total_cotizado": cur.execute("SELECT COALESCE(SUM(total),0) FROM cotizaciones").fetchone()[0],
    }

    top_productos = cur.execute(
        """
        SELECT p.nombre, COALESCE(SUM(ci.cantidad),0) AS unidades
        FROM productos p
        LEFT JOIN cotizacion_items ci ON ci.producto_id = p.id
        GROUP BY p.id
        ORDER BY unidades DESC, p.nombre
        LIMIT 5
        """
    ).fetchall()
    conn.close()

    metrics["top_productos"] = top_productos
    return metrics


def print_resumen() -> None:
    data = resumen_general()
    print("=== REPORTE DE VENTAS ===")
    print(f"Clientes: {data['clientes']}")
    print(f"Productos: {data['productos']}")
    print(f"Cotizaciones: {data['cotizaciones']}")
    print(f"Total cotizado: ${data['total_cotizado']:.2f}")
    print("Top productos:")
    for nombre, unidades in data["top_productos"]:
        print(f" - {nombre}: {unidades} unidades")


if __name__ == "__main__":
    if not DB_PATH.exists():
        raise SystemExit(f"Base de datos no encontrada en {DB_PATH}")
    print_resumen()
