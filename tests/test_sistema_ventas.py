import tempfile
import unittest
from pathlib import Path

from sistema_ventas.service import SistemaVentas, ValidationError
from sistema_ventas.storage import JsonStorage


class SistemaVentasTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "db.json"
        self.sistema = SistemaVentas(JsonStorage(str(self.db_path)))

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_flujo_completo_de_venta_y_resumen(self):
        self.sistema.registrar_producto("P1", "Producto 1", 10.0, 20)
        self.sistema.registrar_producto("P2", "Producto 2", 5.5, 10)
        self.sistema.registrar_cliente("C1", "Cliente 1", "c1@mail.com")

        venta_id = self.sistema.crear_venta("C1", [("P1", 2), ("P2", 3)])

        self.assertEqual("V-00001", venta_id)
        productos = {p["sku"]: p for p in self.sistema.listar_productos()}
        self.assertEqual(18, productos["P1"]["stock"])
        self.assertEqual(7, productos["P2"]["stock"])

        resumen = self.sistema.resumen_ventas()
        self.assertEqual(1, resumen["total_ventas"])
        self.assertEqual(36.5, resumen["total_ingresos"])
        self.assertEqual(5, resumen["unidades_vendidas"])
        self.assertEqual([("P2", 3), ("P1", 2)], resumen["top_productos"])

    def test_no_permite_stock_insuficiente(self):
        self.sistema.registrar_producto("P1", "Producto 1", 10.0, 1)
        self.sistema.registrar_cliente("C1", "Cliente 1", "c1@mail.com")

        with self.assertRaises(ValidationError):
            self.sistema.crear_venta("C1", [("P1", 2)])


if __name__ == "__main__":
    unittest.main()
