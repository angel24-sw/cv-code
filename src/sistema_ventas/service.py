from __future__ import annotations

from collections import defaultdict
from typing import Dict, List, Tuple

from .models import ItemVenta, Venta
from .storage import JsonStorage


class ValidationError(Exception):
    pass


class SistemaVentas:
    def __init__(self, storage: JsonStorage | None = None) -> None:
        self.storage = storage or JsonStorage()

    def registrar_producto(self, sku: str, nombre: str, precio: float, stock: int) -> None:
        data = self.storage.load()
        if sku in data["productos"]:
            raise ValidationError(f"El SKU '{sku}' ya existe.")
        if precio < 0 or stock < 0:
            raise ValidationError("Precio y stock deben ser positivos.")
        data["productos"][sku] = {
            "sku": sku,
            "nombre": nombre,
            "precio": round(precio, 2),
            "stock": stock,
        }
        self.storage.save(data)

    def registrar_cliente(self, cliente_id: str, nombre: str, email: str) -> None:
        data = self.storage.load()
        if cliente_id in data["clientes"]:
            raise ValidationError(f"El cliente '{cliente_id}' ya existe.")
        data["clientes"][cliente_id] = {
            "cliente_id": cliente_id,
            "nombre": nombre,
            "email": email,
        }
        self.storage.save(data)

    def crear_venta(self, cliente_id: str, items: List[Tuple[str, int]]) -> str:
        data = self.storage.load()
        if cliente_id not in data["clientes"]:
            raise ValidationError("Cliente no encontrado.")
        if not items:
            raise ValidationError("La venta debe tener al menos un item.")

        detalle: List[ItemVenta] = []
        for sku, cantidad in items:
            if cantidad <= 0:
                raise ValidationError("La cantidad debe ser mayor a cero.")
            producto = data["productos"].get(sku)
            if not producto:
                raise ValidationError(f"Producto '{sku}' no existe.")
            if producto["stock"] < cantidad:
                raise ValidationError(
                    f"Stock insuficiente para '{sku}'. Disponible: {producto['stock']}"
                )
            detalle.append(
                ItemVenta(sku=sku, cantidad=cantidad, precio_unitario=producto["precio"])
            )

        for item in detalle:
            data["productos"][item.sku]["stock"] -= item.cantidad

        seq = data["secuencias"]["venta"] + 1
        data["secuencias"]["venta"] = seq
        venta_id = f"V-{seq:05d}"
        venta = Venta(
            venta_id=venta_id,
            cliente_id=cliente_id,
            fecha=Venta.now_iso(),
            items=detalle,
        )
        data["ventas"][venta_id] = {
            "venta_id": venta.venta_id,
            "cliente_id": venta.cliente_id,
            "fecha": venta.fecha,
            "items": [
                {
                    "sku": item.sku,
                    "cantidad": item.cantidad,
                    "precio_unitario": item.precio_unitario,
                    "subtotal": item.subtotal,
                }
                for item in venta.items
            ],
            "total": venta.total,
        }
        self.storage.save(data)
        return venta_id

    def listar_productos(self) -> List[Dict]:
        data = self.storage.load()
        return list(data["productos"].values())

    def listar_clientes(self) -> List[Dict]:
        data = self.storage.load()
        return list(data["clientes"].values())

    def listar_ventas(self) -> List[Dict]:
        data = self.storage.load()
        return list(data["ventas"].values())

    def resumen_ventas(self) -> Dict:
        data = self.storage.load()
        ventas = list(data["ventas"].values())
        total_ingresos = round(sum(v["total"] for v in ventas), 2)
        total_ventas = len(ventas)
        unidades_vendidas = 0
        top_productos = defaultdict(int)
        for venta in ventas:
            for item in venta["items"]:
                unidades_vendidas += item["cantidad"]
                top_productos[item["sku"]] += item["cantidad"]

        ranking = sorted(top_productos.items(), key=lambda it: it[1], reverse=True)
        return {
            "total_ingresos": total_ingresos,
            "total_ventas": total_ventas,
            "unidades_vendidas": unidades_vendidas,
            "top_productos": ranking,
        }
