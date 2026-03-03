from __future__ import annotations

import argparse
from typing import List, Tuple

from .service import SistemaVentas, ValidationError


def parse_items(values: List[str]) -> List[Tuple[str, int]]:
    items = []
    for value in values:
        if ":" not in value:
            raise ValidationError(f"Formato inválido para item: {value}. Usa SKU:CANTIDAD")
        sku, qty = value.split(":", 1)
        items.append((sku.strip(), int(qty)))
    return items


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sistema de ventas")
    sub = parser.add_subparsers(dest="command", required=True)

    p_prod = sub.add_parser("nuevo-producto", help="Registrar producto")
    p_prod.add_argument("sku")
    p_prod.add_argument("nombre")
    p_prod.add_argument("precio", type=float)
    p_prod.add_argument("stock", type=int)

    p_cli = sub.add_parser("nuevo-cliente", help="Registrar cliente")
    p_cli.add_argument("cliente_id")
    p_cli.add_argument("nombre")
    p_cli.add_argument("email")

    p_ven = sub.add_parser("venta", help="Crear venta")
    p_ven.add_argument("cliente_id")
    p_ven.add_argument("items", nargs="+", help="Formato SKU:CANTIDAD")

    sub.add_parser("productos", help="Listar productos")
    sub.add_parser("clientes", help="Listar clientes")
    sub.add_parser("ventas", help="Listar ventas")
    sub.add_parser("resumen", help="Mostrar KPIs")

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    sistema = SistemaVentas()

    try:
        if args.command == "nuevo-producto":
            sistema.registrar_producto(args.sku, args.nombre, args.precio, args.stock)
            print("Producto registrado")
        elif args.command == "nuevo-cliente":
            sistema.registrar_cliente(args.cliente_id, args.nombre, args.email)
            print("Cliente registrado")
        elif args.command == "venta":
            venta_id = sistema.crear_venta(args.cliente_id, parse_items(args.items))
            print(f"Venta creada: {venta_id}")
        elif args.command == "productos":
            for p in sistema.listar_productos():
                print(f"{p['sku']} | {p['nombre']} | ${p['precio']} | stock={p['stock']}")
        elif args.command == "clientes":
            for c in sistema.listar_clientes():
                print(f"{c['cliente_id']} | {c['nombre']} | {c['email']}")
        elif args.command == "ventas":
            for v in sistema.listar_ventas():
                print(f"{v['venta_id']} | cliente={v['cliente_id']} | total=${v['total']} | {v['fecha']}")
        elif args.command == "resumen":
            r = sistema.resumen_ventas()
            print(
                f"Ventas: {r['total_ventas']} | Ingresos: ${r['total_ingresos']} | "
                f"Unidades: {r['unidades_vendidas']}"
            )
            print("Top productos:")
            for sku, cantidad in r["top_productos"]:
                print(f"- {sku}: {cantidad}")
    except ValidationError as exc:
        print(f"Error: {exc}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
