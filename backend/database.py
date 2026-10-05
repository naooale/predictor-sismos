"""
Manejador de Base de Datos SQLite para el Sistema de Riesgo Sísmico del Perú.
Gestiona la conexión, creación de tablas y la semilla histórica oficial.
"""

import sqlite3
import os
from typing import List, Dict, Any, Optional

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database")
DB_PATH = os.path.join(DB_DIR, "sismos.db")


def get_db_connection() -> sqlite3.Connection:
    """Obtiene una conexión a la base de datos SQLite con formato de diccionario."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Inicializa la base de datos y precarga los sismos históricos si la tabla está vacía."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sismos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha TEXT NOT NULL,
            hora TEXT NOT NULL,
            region TEXT NOT NULL,
            magnitud REAL NOT NULL,
            profundidad REAL NOT NULL,
            latitud REAL NOT NULL,
            longitud REAL NOT NULL,
            descripcion TEXT
        )
    """)

    # Verificar si ya existen registros
    cursor.execute("SELECT COUNT(*) as count FROM sismos")
    count = cursor.fetchone()["count"]

    if count == 0:
        # Semilla con eventos sísmicos históricos reales y emblemáticos del Perú
        sismos_iniciales = [
            ("1970-05-31", "15:23:27", "Áncash (Chimbote / Huaraz)", 7.9, 64.0, -9.23, -78.84,
             "El evento más catastrófico de la historia peruana. Provocó el alud de Yungay."),
            ("2007-08-15", "18:40:57", "Ica (Pisco)", 8.0, 39.0, -13.35, -76.51,
             "Terremoto interplaca en Pisco, Ica y Chincha. Ocasionó un tsunami local moderado."),
            ("2001-06-23", "15:33:14", "Arequipa (Camaná / Ocoña)", 8.4, 33.0, -16.26, -73.64,
             "Mega-terremoto en el sur peruano con posterior tsunami destructivo en Camaná."),
            ("1974-10-03", "09:21:29", "Lima (Callao / Cañete)", 7.6, 13.0, -12.48, -77.82,
             "Destrucción severa en Lima, Chorrillos, Barranco y Cañete."),
            ("2019-05-26", "02:41:14", "Loreto (Lagunas)", 8.0, 135.0, -5.81, -75.27,
             "Sismo intraplaca de profundidad intermedia sentido en todo el norte del Perú, Ecuador y Colombia."),
            ("1996-11-12", "11:59:44", "Ica (Nazca)", 7.7, 33.0, -14.99, -75.68,
             "Destrucción masiva de viviendas de adobe en Nazca, Palpa, Marcona y Acari."),
            ("1966-10-17", "16:41:53", "Lima (Huacho / Callao)", 8.1, 38.0, -10.80, -78.70,
             "Terremoto frente a la costa central con tsunami y daños en Huacho y Lima."),
            ("1940-05-24", "11:35:00", "Lima (Chorrillos / Callao)", 8.2, 60.0, -11.90, -77.50,
             "Colapsaron miles de edificaciones en Lima, Callao y Chorrillos."),
            ("1746-10-28", "22:30:00", "Lima y Callao", 8.6, 25.0, -12.04, -77.30,
             "El mayor terremoto colonial registrado con un tsunami que arrasó por completo el puerto del Callao."),
            ("2021-11-28", "05:52:12", "Amazonas (Sta. María de Nieva)", 7.5, 131.0, -4.49, -76.85,
             "Sismo profundo en la cuenca amazónica que causó derrumbes en carreteras y daños estructurales."),
            ("2016-08-14", "21:58:28", "Arequipa (Valle del Colca)", 5.3, 8.0, -15.63, -71.60,
             "Sismo cortical extremadamente superficial con alta aceleración local en Chivay e Ichupampa."),
            ("2018-01-14", "04:18:42", "Arequipa (Lomas - Caravelí)", 7.1, 36.0, -15.78, -74.74,
             "Evento de subducción interplaca frente a las costas de Arequipa e Ica."),
            ("2022-05-26", "07:02:18", "Puno (Ayaviri)", 7.2, 218.0, -14.88, -70.43,
             "Evento de profundidad intermedia en el manto litosférico bajo el altiplano."),
            ("2005-09-25", "20:55:34", "San Martín (Lamas / Moyobamba)", 7.5, 115.0, -5.68, -76.40,
             "Afectó seriamente viviendas y centros educativos en la selva alta."),
            ("2021-06-22", "21:54:18", "Lima (Mala - Cañete)", 6.0, 32.0, -12.75, -76.71,
             "Sismo superficial sentido con gran alarma y desprendimiento de rocas en la Costa Verde de Lima.")
        ]

        cursor.executemany("""
            INSERT INTO sismos (fecha, hora, region, magnitud, profundidad, latitud, longitud, descripcion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, sismos_iniciales)
        conn.commit()

    conn.close()


def listar_sismos(region: Optional[str] = None, min_magnitud: Optional[float] = None) -> List[Dict[str, Any]]:
    """Consulta la lista de sismos con filtros opcionales."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM sismos WHERE 1=1"
    params = []

    if region:
        query += " AND region LIKE ?"
        params.append(f"%{region}%")

    if min_magnitud is not None:
        query += " AND magnitud >= ?"
        params.append(min_magnitud)

    query += " ORDER BY fecha DESC, hora DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def obtener_sismo_por_id(sismo_id: int) -> Optional[Dict[str, Any]]:
    """Obtiene un sismo por su identificador primario."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sismos WHERE id = ?", (sismo_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def crear_sismo(data: Dict[str, Any]) -> Dict[str, Any]:
    """Inserta un nuevo sismo en la base de datos."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO sismos (fecha, hora, region, magnitud, profundidad, latitud, longitud, descripcion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data["fecha"], data["hora"], data["region"],
        data["magnitud"], data["profundidad"],
        data["latitud"], data["longitud"],
        data.get("descripcion", "")
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return obtener_sismo_por_id(new_id)


def actualizar_sismo(sismo_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Actualiza campos específicos de un sismo existente."""
    conn = get_db_connection()
    cursor = conn.cursor()

    campos = []
    valores = []
    for k, v in data.items():
        if v is not None and k != "id":
            campos.append(f"{k} = ?")
            valores.append(v)

    if not campos:
        conn.close()
        return obtener_sismo_por_id(sismo_id)

    valores.append(sismo_id)
    query = f"UPDATE sismos SET {', '.join(campos)} WHERE id = ?"
    cursor.execute(query, valores)
    conn.commit()
    conn.close()
    return obtener_sismo_por_id(sismo_id)


def eliminar_sismo(sismo_id: int) -> bool:
    """Elimina un registro de sismo."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sismos WHERE id = ?", (sismo_id,))
    filas = cursor.rowcount
    conn.commit()
    conn.close()
    return filas > 0


def obtener_estadisticas() -> Dict[str, Any]:
    """Genera datos agregados para los 5 gráficos analíticos."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM sismos ORDER BY fecha ASC")
    sismos = [dict(row) for row in cursor.fetchall()]
    conn.close()

    # 1. Por región
    conteo_regiones = {}
    # 2. Profundidades
    profundidades = {"Superficial (< 60 km)": 0, "Intermedio (60 - 300 km)": 0, "Profundo (> 300 km)": 0}
    # 3. Distribución de magnitudes
    rangos_magnitud = {"Leve (< 5.0)": 0, "Moderado (5.0 - 6.9)": 0, "Fuerte (7.0 - 7.9)": 0, "Catastrófico (≥ 8.0)": 0}

    for s in sismos:
        reg_simplificada = s["region"].split("(")[0].strip()
        conteo_regiones[reg_simplificada] = conteo_regiones.get(reg_simplificada, 0) + 1

        p = s["profundidad"]
        if p < 60:
            profundidades["Superficial (< 60 km)"] += 1
        elif p <= 300:
            profundidades["Intermedio (60 - 300 km)"] += 1
        else:
            profundidades["Profundo (> 300 km)"] += 1

        m = s["magnitud"]
        if m < 5.0:
            rangos_magnitud["Leve (< 5.0)"] += 1
        elif m < 7.0:
            rangos_magnitud["Moderado (5.0 - 6.9)"] += 1
        elif m < 8.0:
            rangos_magnitud["Fuerte (7.0 - 7.9)"] += 1
        else:
            rangos_magnitud["Catastrófico (≥ 8.0)"] += 1

    return {
        "total": len(sismos),
        "sismos": sismos,
        "por_region": conteo_regiones,
        "por_profundidad": profundidades,
        "por_rango_magnitud": rangos_magnitud
    }
