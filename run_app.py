"""
Script de inicio automático para el Sistema de Estimación y Simulación de Riesgo Sísmico del Perú.
Ejecuta el servidor FastAPI en Uvicorn y abre automáticamente la aplicación en el navegador web.
"""

import sys
import os
import webbrowser
import time

# Asegurar que el directorio raíz del proyecto esté en el PATH de Python
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)

def main():
    print("=" * 70)
    print("  SISTEMA DE ESTIMACIÓN Y SIMULACIÓN DE RIESGO SÍSMICO DEL PERÚ")
    print("  Herramienta Educativa e Interactiva con Simulador 3D")
    print("=" * 70)
    print("\nIniciando servidor backend FastAPI en http://localhost:8000 ...")

    url = "http://localhost:8000"

    def abrir_navegador():
        time.sleep(1.2)
        print(f"Abriendo aplicación web en el navegador: {url}")
        webbrowser.open(url)

    import threading
    t = threading.Thread(target=abrir_navegador)
    t.daemon = True
    t.start()

    try:
        import uvicorn
        uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
    except KeyboardInterrupt:
        print("\nServidor detenido por el usuario.")
    except Exception as e:
        print(f"\nError al iniciar Uvicorn: {e}")
        print("\nPuedes abrir directamente el archivo frontend/index.html en tu navegador.")

if __name__ == "__main__":
    main()
