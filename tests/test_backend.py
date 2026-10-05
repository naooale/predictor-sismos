"""
Script de verificación de endpoints y cálculo de riesgo para el Sistema de Sismos del Perú.
"""

import sys
import os

# Configurar salida segura UTF-8 para Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from backend.database import init_db, listar_sismos, crear_sismo, eliminar_sismo, obtener_estadisticas
from backend.risk_engine import estimar_riesgo_sismico

def test_todo():
    print("--- 1. Inicializando Base de Datos ---")
    init_db()
    sismos = listar_sismos()
    print(f"Total de sismos registrados: {len(sismos)}")
    assert len(sismos) >= 15, "Deben existir al menos 15 sismos históricos precargados."

    print("\n--- 2. Verificando Filtros ---")
    sismos_lima = listar_sismos(region="Lima")
    print(f"Sismos en region Lima: {len(sismos_lima)}")
    assert len(sismos_lima) > 0, "Debe haber sismos en Lima."

    sismos_catastroficos = listar_sismos(min_magnitud=8.0)
    print(f"Sismos con magnitud >= 8.0: {len(sismos_catastroficos)}")
    assert len(sismos_catastroficos) > 0, "Debe haber sismos con M >= 8.0."

    print("\n--- 3. Verificando CRUD ---")
    nuevo = crear_sismo({
        "fecha": "2026-01-15",
        "hora": "10:30:00",
        "region": "Prueba Cusco",
        "magnitud": 6.2,
        "profundidad": 20.0,
        "latitud": -13.5,
        "longitud": -71.9,
        "descripcion": "Sismo de prueba para verificación automática"
    })
    print(f"Sismo de prueba creado con ID: {nuevo['id']}")
    assert nuevo["region"] == "Prueba Cusco"

    exito = eliminar_sismo(nuevo["id"])
    print(f"Sismo de prueba eliminado: {exito}")
    assert exito is True

    print("\n--- 4. Verificando Estadísticas para Gráficos ---")
    stats = obtener_estadisticas()
    print(f"Total regiones analizadas: {len(stats['por_region'])}")
    print(f"Distribucion de profundidades: {stats['por_profundidad']}")
    print(f"Distribucion de magnitudes: {stats['por_rango_magnitud']}")
    assert "Superficial (< 60 km)" in stats["por_profundidad"]

    print("\n--- 5. Verificando Motor de Riesgo Sísmico ---")
    riesgo_alto = estimar_riesgo_sismico(
        magnitud=8.2,
        profundidad=25.0,
        latitud=-12.04,
        longitud=-77.30,
        region="Lima (Costa Central)"
    )
    print(f"Caso Lima M8.2: Nivel={riesgo_alto['nivel_riesgo']} {riesgo_alto['color_riesgo']}, %={riesgo_alto['porcentaje_riesgo']}%")
    assert riesgo_alto["nivel_riesgo"] in ["Alto", "Muy Alto"]

    riesgo_bajo = estimar_riesgo_sismico(
        magnitud=4.2,
        profundidad=250.0,
        latitud=-4.5,
        longitud=-74.0,
        region="Loreto (Selva)"
    )
    print(f"Caso Loreto M4.2 profundo: Nivel={riesgo_bajo['nivel_riesgo']} {riesgo_bajo['color_riesgo']}, %={riesgo_bajo['porcentaje_riesgo']}%")
    assert riesgo_bajo["nivel_riesgo"] in ["Bajo", "Medio"]

    print("\n--- 6. Verificando Pronóstico Semanal de Zonas (proximosismo.org) ---")
    from backend.risk_engine import obtener_pronosticos, obtener_ultimo_sismo_igp, obtener_metricas_cientificas
    pronosticos = obtener_pronosticos()
    assert "metadata" in pronosticos
    assert "zonas" in pronosticos
    assert len(pronosticos["zonas"]) >= 15
    print(f"Zonas evaluadas para pronóstico: {len(pronosticos['zonas'])}")
    print(f"Ventana de validez: {pronosticos['metadata']['ventana_validez']}")
    print(f"Probabilidad máxima: {pronosticos['metadata']['prob_maxima']}%")

    ultimo_igp = obtener_ultimo_sismo_igp()
    assert "magnitud" in ultimo_igp
    assert "epicentro" in ultimo_igp
    print(f"Último sismo IGP: M {ultimo_igp['magnitud']} en {ultimo_igp['epicentro']}")

    metricas = obtener_metricas_cientificas()
    assert metricas["rendimiento"]["roc_auc"] > 0.8
    print(f"Métricas del modelo: ROC-AUC={metricas['rendimiento']['roc_auc']}, F1={metricas['rendimiento']['f1_score_optimo']}")

    print("\n=== TODAS LAS PRUEBAS PASARON EXITOSAMENTE ===")

if __name__ == "__main__":
    test_todo()

