"""
Modelos de datos Pydantic para el Sistema de Estimación y Simulación de Riesgo Sísmico del Perú.
Define esquemas de validación para sismos históricos y análisis de riesgo experimental.
"""

from pydantic import BaseModel, Field
from typing import Optional


class SismoBase(BaseModel):
    fecha: str = Field(..., description="Fecha del evento en formato YYYY-MM-DD", example="2007-08-15")
    hora: str = Field(..., description="Hora del evento en formato HH:MM o HH:MM:SS", example="18:40:57")
    region: str = Field(..., description="Región o departamento del Perú", example="Ica (Pisco)")
    magnitud: float = Field(..., ge=1.0, le=10.0, description="Magnitud en escala de Momento (Mw) o Richter", example=8.0)
    profundidad: float = Field(..., ge=0.0, le=800.0, description="Profundidad focal en kilómetros (km)", example=39.0)
    latitud: float = Field(..., ge=-20.0, le=1.0, description="Latitud (grados decimales, Perú entre -0.03 y -18.35)", example=-13.35)
    longitud: float = Field(..., ge=-85.0, le=-67.0, description="Longitud (grados decimales, Perú entre -68.65 y -81.33)", example=-76.51)
    descripcion: Optional[str] = Field(None, description="Detalles o efectos históricos notables")


class SismoCreate(SismoBase):
    pass


class SismoUpdate(BaseModel):
    fecha: Optional[str] = None
    hora: Optional[str] = None
    region: Optional[str] = None
    magnitud: Optional[float] = Field(None, ge=1.0, le=10.0)
    profundidad: Optional[float] = Field(None, ge=0.0, le=800.0)
    latitud: Optional[float] = Field(None, ge=-20.0, le=1.0)
    longitud: Optional[float] = Field(None, ge=-85.0, le=-67.0)
    descripcion: Optional[str] = None


class SismoResponse(SismoBase):
    id: int

    class Config:
        from_attributes = True


class AnalisisRiesgoRequest(BaseModel):
    magnitud: float = Field(..., ge=1.0, le=10.0, description="Magnitud hipotética a evaluar")
    profundidad: float = Field(..., ge=0.0, le=800.0, description="Profundidad en km")
    latitud: float = Field(..., description="Latitud en grados decimales")
    longitud: float = Field(..., description="Longitud en grados decimales")
    region: str = Field(..., description="Región seleccionada")
    fecha: Optional[str] = Field(None, description="Fecha de referencia")


class AnalisisRiesgoResponse(BaseModel):
    nivel_riesgo: str = Field(..., description="Bajo, Medio, Alto o Muy Alto")
    color_riesgo: str = Field(..., description="Código de color o emoji (🟢, 🟡, 🟠, 🔴)")
    porcentaje_riesgo: float = Field(..., description="Porcentaje experimental estimado (0 - 100%)")
    magnitud: float
    profundidad: float
    region: str
    energia_estimada_joules: float
    explicacion: str
    advertencia: str
