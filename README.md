# Sistema de control sanitario

Aplicación web con login, menú e interfaz moderna para registrar:

- Baldes de aceite recogidos.
- Baldes con trampas.
- Fumigaciones.
- Desratización.
- Recojo de residuos.
- Limpieza de trampa de grasa.

## Requisitos

- Python 3.10+

## Instalación

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Ejecución

```bash
python app.py
```

Abrir en `http://127.0.0.1:5000`.

## Usuario inicial

- Usuario: `admin`
- Contraseña: `admin123`

> En el primer inicio se crea automáticamente la base de datos SQLite (`registros.db`).
