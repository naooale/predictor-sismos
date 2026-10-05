"""
Servidor API REST FastAPI para el Sistema de Estimación y Simulación de Riesgo Sísmico del Perú.
Sirve los endpoints de datos, análisis de riesgo y archivos estáticos del frontend.
"""

import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import Optional, List

from .models import (
    SismoCreate,
    SismoUpdate,
    SismoResponse,
    AnalisisRiesgoRequest,
    AnalisisRiesgoResponse
)
from .database import (
    init_db,
    listar_sismos,
    obtener_sismo_por_id,
    crear_sismo,
    actualizar_sismo,
    eliminar_sismo,
    obtener_estadisticas
)
from .risk_engine import (
    estimar_riesgo_sismico,
    obtener_pronosticos,
    obtener_ultimo_sismo_igp,
    obtener_metricas_cientificas
)

# Inicializar Base de Datos con catálogo histórico peruano
init_db()

app = FastAPI(
    title="Sistema de Estimación y Simulación de Riesgo Sísmico del Perú",
    description="Herramienta educativa y experimental basada en sismicidad histórica y física de placas tectónicas.",
    version="1.0.0"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas de API REST
@app.get("/api/salud", tags=["Sistema"])
def chequear_salud():
    return {
        "estado": "activo",
        "aplicacion": "Sistema de Estimación y Simulación de Riesgo Sísmico del Perú",
        "modo": "Educativo / Experimental"
    }


@app.get("/api/sismos", response_model=List[SismoResponse], tags=["Registro Histórico"])
def api_listar_sismos(
    region: Optional[str] = Query(None, description="Filtro por departamento o región"),
    min_magnitud: Optional[float] = Query(None, description="Magnitud mínima a filtrar")
):
    return listar_sismos(region=region, min_magnitud=min_magnitud)


@app.get("/api/sismos/{sismo_id}", response_model=SismoResponse, tags=["Registro Histórico"])
def api_obtener_sismo(sismo_id: int):
    sismo = obtener_sismo_por_id(sismo_id)
    if not sismo:
        raise HTTPException(status_code=404, detail="Sismo no encontrado en el registro.")
    return sismo


@app.post("/api/sismos", response_model=SismoResponse, status_code=201, tags=["Registro Histórico"])
def api_crear_sismo(sismo: SismoCreate):
    return crear_sismo(sismo.model_dump())


@app.put("/api/sismos/{sismo_id}", response_model=SismoResponse, tags=["Registro Histórico"])
def api_actualizar_sismo(sismo_id: int, sismo: SismoUpdate):
    existente = obtener_sismo_por_id(sismo_id)
    if not existente:
        raise HTTPException(status_code=404, detail="Sismo a actualizar no encontrado.")
    return actualizar_sismo(sismo_id, sismo.model_dump(exclude_unset=True))


@app.delete("/api/sismos/{sismo_id}", tags=["Registro Histórico"])
def api_eliminar_sismo(sismo_id: int):
    exito = eliminar_sismo(sismo_id)
    if not exito:
        raise HTTPException(status_code=404, detail="Sismo a eliminar no encontrado.")
    return {"mensaje": f"Sismo {sismo_id} eliminado exitosamente."}


@app.post("/api/analizar-riesgo", response_model=AnalisisRiesgoResponse, tags=["Estimación de Riesgo"])
def api_analizar_riesgo(solicitud: AnalisisRiesgoRequest):
    historicos = listar_sismos(region=solicitud.region)
    conteo_regional = len(historicos)

    resultado = estimar_riesgo_sismico(
        magnitud=solicitud.magnitud,
        profundidad=solicitud.profundidad,
        latitud=solicitud.latitud,
        longitud=solicitud.longitud,
        region=solicitud.region,
        conteo_historico_regional=conteo_regional
    )
    return resultado


@app.get("/api/estadisticas", tags=["Estadísticas"])
def api_obtener_estadisticas():
    return obtener_estadisticas()


@app.get("/api/pronosticos", tags=["Pronóstico Sísmico"])
def api_obtener_pronosticos():
    return obtener_pronosticos()


@app.get("/api/ultimo-sismo-igp", tags=["Sismicidad en Tiempo Real"])
def api_obtener_ultimo_sismo_igp():
    return obtener_ultimo_sismo_igp()


@app.get("/api/metricas-cientificas", tags=["Panel Científico"])
def api_obtener_metricas_cientificas():
    return obtener_metricas_cientificas()


# Montar archivos estáticos del Frontend
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")

if os.path.exists(FRONTEND_DIR):
    from fastapi.responses import HTMLResponse
    
    @app.get("/", response_class=HTMLResponse)
    def serve_index():
        index_path = os.path.join(FRONTEND_DIR, "index.html")
        with open(index_path, "r", encoding="utf-8") as f:
            content = f.read()
        return HTMLResponse(
            content=content,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )

    # El resto de los estáticos
    app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="frontend")

