from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


DEFAULT_DB = {
    "productos": {},
    "clientes": {},
    "ventas": {},
    "secuencias": {"venta": 0},
}


class JsonStorage:
    def __init__(self, db_path: str = "data/ventas_db.json") -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.db_path.exists():
            self.save(DEFAULT_DB.copy())

    def load(self) -> Dict[str, Any]:
        with self.db_path.open("r", encoding="utf-8") as fh:
            return json.load(fh)

    def save(self, data: Dict[str, Any]) -> None:
        with self.db_path.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
