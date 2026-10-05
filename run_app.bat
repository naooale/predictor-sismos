@echo off
title Sistema de Estimacion y Simulacion de Riesgo Sismico del Peru
echo =========================================================================
echo   SISTEMA DE ESTIMACION Y SIMULACION DE RIESGO SISMICO DEL PERU
echo   Herramienta Educativa e Interactiva con Simulador 3D
echo =========================================================================
echo.
echo Verificando dependencias de Python...
python -m pip install -r requirements.txt --quiet
echo.
echo Iniciando servidor FastAPI y abriendo navegador...
start http://localhost:8000
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause
