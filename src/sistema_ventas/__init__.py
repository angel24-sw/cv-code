"""Sistema de ventas con inventario, clientes, ventas y reportes."""

from .service import SistemaVentas, ValidationError

__all__ = ["SistemaVentas", "ValidationError"]
