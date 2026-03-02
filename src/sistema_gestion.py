import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

IGV_RATE = 0.18


@dataclass
class VentaDetalle:
    cliente: str
    producto: str
    precio: float


class SistemaVentas:
    def __init__(self, db_path: str = "src/ventas.db") -> None:
        self.db_path = Path(db_path)
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        self._crear_tablas()

    def _crear_tablas(self) -> None:
        with self.conn:
            self.conn.execute(
                """
                CREATE TABLE IF NOT EXISTS clientes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL UNIQUE
                )
                """
            )
            self.conn.execute(
                """
                CREATE TABLE IF NOT EXISTS productos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL UNIQUE,
                    precio REAL NOT NULL CHECK (precio >= 0)
                )
                """
            )
            self.conn.execute(
                """
                CREATE TABLE IF NOT EXISTS ventas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cliente_id INTEGER NOT NULL,
                    producto_id INTEGER NOT NULL,
                    precio REAL NOT NULL CHECK (precio >= 0),
                    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
                    FOREIGN KEY (producto_id) REFERENCES productos(id)
                )
                """
            )

    def cerrar(self) -> None:
        self.conn.close()

    def agregar_cliente(self, nombre: str) -> None:
        with self.conn:
            self.conn.execute("INSERT OR IGNORE INTO clientes(nombre) VALUES(?)", (nombre.strip(),))

    def agregar_producto(self, nombre: str, precio: float) -> None:
        with self.conn:
            self.conn.execute(
                "INSERT OR REPLACE INTO productos(nombre, precio) VALUES(?, ?)",
                (nombre.strip(), precio),
            )

    def _buscar_cliente_id(self, nombre: str) -> Optional[int]:
        row = self.conn.execute("SELECT id FROM clientes WHERE nombre = ?", (nombre.strip(),)).fetchone()
        return row["id"] if row else None

    def _buscar_producto(self, nombre: str) -> Optional[sqlite3.Row]:
        return self.conn.execute(
            "SELECT id, precio FROM productos WHERE nombre = ?", (nombre.strip(),)
        ).fetchone()

    def registrar_venta(self, cliente: str, producto: str) -> None:
        cliente_id = self._buscar_cliente_id(cliente)
        producto_row = self._buscar_producto(producto)
        if cliente_id is None:
            raise ValueError(f"El cliente '{cliente}' no existe.")
        if producto_row is None:
            raise ValueError(f"El producto '{producto}' no existe.")

        with self.conn:
            self.conn.execute(
                "INSERT INTO ventas(cliente_id, producto_id, precio) VALUES(?, ?, ?)",
                (cliente_id, producto_row["id"], float(producto_row["precio"])),
            )

    def listar_ventas(self) -> List[VentaDetalle]:
        rows = self.conn.execute(
            """
            SELECT c.nombre AS cliente, p.nombre AS producto, v.precio
            FROM ventas v
            JOIN clientes c ON c.id = v.cliente_id
            JOIN productos p ON p.id = v.producto_id
            ORDER BY v.id ASC
            """
        ).fetchall()
        return [VentaDetalle(cliente=row["cliente"], producto=row["producto"], precio=row["precio"]) for row in rows]

    def resumen(self) -> dict:
        row = self.conn.execute(
            "SELECT COALESCE(SUM(precio), 0) AS total, COALESCE(AVG(precio), 0) AS promedio FROM ventas"
        ).fetchone()
        subtotal = float(row["total"])
        promedio = float(row["promedio"])
        igv = subtotal * IGV_RATE
        total_con_igv = subtotal + igv
        return {
            "subtotal": round(subtotal, 2),
            "promedio": round(promedio, 2),
            "igv": round(igv, 2),
            "total_con_igv": round(total_con_igv, 2),
        }


def main() -> None:
    sistema = SistemaVentas()
    try:
        print("=== Sistema de Ventas ===")
        while True:
            print("\n1) Agregar cliente")
            print("2) Agregar producto")
            print("3) Registrar venta")
            print("4) Ver ventas y resumen")
            print("5) Salir")
            opcion = input("Elige una opción: ").strip()

            if opcion == "1":
                nombre = input("Nombre del cliente: ")
                sistema.agregar_cliente(nombre)
                print("✅ Cliente guardado")
            elif opcion == "2":
                nombre = input("Nombre del producto: ")
                precio = float(input("Precio del producto: "))
                sistema.agregar_producto(nombre, precio)
                print("✅ Producto guardado")
            elif opcion == "3":
                cliente = input("Cliente: ")
                producto = input("Producto: ")
                try:
                    sistema.registrar_venta(cliente, producto)
                    print("✅ Venta registrada")
                except ValueError as exc:
                    print(f"❌ {exc}")
            elif opcion == "4":
                ventas = sistema.listar_ventas()
                if not ventas:
                    print("No hay ventas registradas")
                else:
                    for i, venta in enumerate(ventas, start=1):
                        print(f"{i}. Cliente: {venta.cliente} | Producto: {venta.producto} | Precio: {venta.precio:.2f}")
                resumen = sistema.resumen()
                print("--- Resumen ---")
                print(f"Subtotal: {resumen['subtotal']:.2f}")
                print(f"Promedio: {resumen['promedio']:.2f}")
                print(f"IGV (18%): {resumen['igv']:.2f}")
                print(f"Total + IGV: {resumen['total_con_igv']:.2f}")
            elif opcion == "5":
                print("Hasta luego")
                break
            else:
                print("Opción no válida")
    finally:
        sistema.cerrar()


if __name__ == "__main__":
    main()
