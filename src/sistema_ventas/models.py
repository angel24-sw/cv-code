from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import List


@dataclass
class Producto:
    sku: str
    nombre: str
    precio: float
    stock: int


@dataclass
class Cliente:
    cliente_id: str
    nombre: str
    email: str


@dataclass
class ItemVenta:
    sku: str
    cantidad: int
    precio_unitario: float

    @property
    def subtotal(self) -> float:
        return round(self.cantidad * self.precio_unitario, 2)


@dataclass
class Venta:
    venta_id: str
    cliente_id: str
    fecha: str
    items: List[ItemVenta] = field(default_factory=list)

    @property
    def total(self) -> float:
        return round(sum(item.subtotal for item in self.items), 2)

    @staticmethod
    def now_iso() -> str:
        return datetime.utcnow().isoformat(timespec="seconds")
