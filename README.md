# Sistema de Estimación y Simulación de Riesgo Sísmico del Perú

> **Herramienta Educativa e Interactiva** para el análisis de sismicidad histórica, estimación experimental del nivel de riesgo y simulación física de placas tectónicas a doble escala (macroscópica y microscópica) en **3D interactivo**.

---

## ⚠️ AVISO CIENTÍFICO Y EDUCATIVO IMPORTANTE

**Este sistema es educativo y experimental.** La ciencia geofísica actual **NO puede predecir con exactitud** la fecha, hora, magnitud ni el epicentro de un terremoto real. 

El porcentaje de riesgo mostrado por el sistema representa un **cálculo experimental y pedagógico** generado a partir de variables de magnitud, profundidad, distancias a centros urbanos y recurrencia histórica de la zona de subducción peruana. Su propósito exclusivo es la **enseñanza de física, geología, prevención y análisis de datos**.

---

## 1. Tecnologías Empleadas

- **Frontend:**
  - **HTML5:** Semántica moderna, WebGL para renderizado 3D a 60 FPS.
  - **CSS3:** Diseño responsivo (móvil y escritorio), modo oscuro científico, tarjetas Glassmorphism, animaciones de fluidos e indicadores de riesgo.
  - **JavaScript (ES6+):** Arquitectura modular, integración de API REST, motor de física 3D y sismógrafo en tiempo real.
  - **Three.js & OrbitControls (3D):** Motor WebGL para renderizado tridimensional inmersivo de la subducción tectónica, relieve de los Andes, ondas volumétricas y red cristalina.
  - **Leaflet.js:** Mapa interactivo con relieve, fosa peruano-chilena y puntos sísmicos georreferenciados.
  - **Chart.js:** 5 visualizaciones analíticas dinámicas y reactivas.
- **Backend:**
  - **Python 3.10+ / 3.14+**
  - **FastAPI:** API REST de alto rendimiento con documentación Swagger interactiva.
  - **Uvicorn:** Servidor ASGI para producción y desarrollo.
  - **Pydantic:** Validación estricta de esquemas de datos.
- **Base de Datos:**
  - **SQLite 3:** Almacenamiento local ligero integrado con catálogo precargado de 15 sismos históricos emblemáticos del Perú (1746 a 2022).

---

## 2. Estructura del Proyecto

```text
predictor-sismos-peru/
│
├── backend/
│   ├── main.py            # Servidor FastAPI, endpoints REST y servidor estático
│   ├── database.py        # Conexión SQLite y semilla de sismos históricos del Perú
│   ├── models.py          # Modelos Pydantic para validación de datos
│   └── risk_engine.py     # Algoritmo de estimación experimental de riesgo sísmico
│
├── database/
│   └── sismos.db          # Base de datos SQLite (se genera automáticamente)
│
├── frontend/
│   ├── index.html         # Interfaz principal completa y accesible con visor 3D
│   ├── css/
│   │   └── styles.css     # Estilos visuales, variables, visor 3D y animaciones
│   └── js/
│       ├── app.js         # Orquestador frontend, CRUD y modo offline/online
│       ├── mapa.js        # Módulo del mapa Leaflet del Perú
│       ├── graficos.js    # 5 gráficos estadísticos interactivos Chart.js
│       └── simulacion.js  # Motor físico 3D Three.js: Macro (Placas) y Micro (Red)
│
├── requirements.txt       # Librerías de Python requeridas
├── run_app.py             # Script de inicio en Python (abre navegador automáticamente)
├── run_app.bat            # Script de ejecución con 1 clic para Windows
└── README.md              # Documentación e instrucciones
```

---

## 3. Guía Paso a Paso para Visual Studio Code

### Paso 1: Abrir la carpeta en Visual Studio Code
1. Abre **Visual Studio Code**.
2. En el menú superior, ve a **Archivo (File)** > **Abrir carpeta... (Open Folder...)**.
3. Selecciona la carpeta del proyecto:
   ```text
   C:\Users\Alexissanchez\.gemini\antigravity\scratch\predictor-sismos-peru
   ```
4. Haz clic en **Seleccionar carpeta**.

---

### Paso 2: Extensiones recomendadas en Visual Studio Code
Para tener la mejor experiencia de desarrollo, se sugiere instalar desde la pestaña de Extensiones (`Ctrl + Shift + X`):
1. **Python** (de Microsoft): Para autocompletado, ejecución y depuración de código Python.
2. **Live Server** (de Ritwick Dey): Permite previsualizar el `index.html` con recarga en vivo opcional.
3. **SQLite Viewer** (de Florian Klampfer): Para visualizar visualmente el archivo `database/sismos.db`.

---

### Paso 3: Abrir la terminal e instalar dependencias
1. En VS Code, abre una terminal integrada presionando `` Ctrl + ` `` (Ctrl + tecla de comilla invertida) o yendo al menú **Terminal** > **Nueva terminal**.
2. Asegúrate de estar en la carpeta raíz del proyecto y ejecuta:
   ```bash
   pip install -r requirements.txt
   ```
   *(Instalará `fastapi`, `uvicorn` y `pydantic`).*

---

### Paso 4: Ejecutar la aplicación

Tienes **3 opciones sencillas** para iniciar el proyecto:

#### Opción A (Recomendada - Con un solo comando en terminal):
```bash
python run_app.py
```
*Este comando iniciará el servidor backend y abrirá automáticamente tu navegador predeterminado en `http://localhost:8000`.*

#### Opción B (Comando directo de Uvicorn):
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Opción C (Doble clic en Windows):
Simplemente haz doble clic sobre el archivo `run_app.bat` dentro del explorador de archivos.

---

### Paso 5: ¿Qué dirección colocar en Google Chrome?
Abre Google Chrome o tu navegador favorito e ingresa:
```text
http://localhost:8000
```
También puedes explorar la documentación interactiva de la API en:
```text
http://localhost:8000/docs
```

> **Nota de flexibilidad (Modo Autónomo / Offline):**
> Si por alguna razón no deseas iniciar el backend de Python, puedes simplemente abrir el archivo `frontend/index.html` directamente en tu navegador (o mediante la extensión Live Server). La aplicación detectará automáticamente la ausencia de servidor y activará su motor local con almacenamiento en `localStorage`, permitiendo utilizar todas las funciones (mapa, simuladores 3D, gráficos y cálculos de riesgo) sin ningún fallo.

---

## 4. Funcionalidades Principales

### 1. Mapa Interactivo y Estimador de Riesgo
- **Mapa Geoespacial:** Centrado en el Perú, muestra eventos sísmicos con círculos proporcionales a la magnitud y coloreados según la profundidad focal (Superficiales en rojo, Intermedios en naranja, Profundos en azul).
- **Fosa Peruano-Chilena:** Trazo cartográfico que delimita la zona de contacto de subducción entre la Placa de Nazca y la Placa Sudamericana.
- **Captura al Clic:** Haz clic en cualquier punto del territorio peruano para obtener latitud, longitud y estimación automática del departamento correspondiente en el formulario de análisis.
- **Resultado del Riesgo:** Muestra el nivel (🟢 Bajo, 🟡 Medio, 🟠 Alto, 🔴 Muy Alto), porcentaje estimado, energía liberada aproximada en Joules ($E = 10^{4.8 + 1.5 M}$) y fundamentación técnica.

### 2. Registro Histórico de Sismos (CRUD Completo)
- Tabla con fecha, hora, región, magnitud, profundidad y coordenadas.
- **Búsqueda en tiempo real** por región (ej: Lima, Ica, Arequipa).
- **Filtro dinámico** por magnitud mínima.
- Botones para **Agregar**, **Editar** y **Eliminar** sismos directamente en SQLite.

### 3. Gráficos Estadísticos (Chart.js)
1. **Magnitud de los sismos:** Comparativa de eventos en escala Mw.
2. **Cantidad por región:** Distribución de eventos por departamentos peruanos.
3. **Profundidad focal:** Clasificación porcentual (Superficial <60 km, Intermedio 60-300 km, Profundo >300 km).
4. **Evolución cronológica:** Línea de tiempo que refleja la ocurrencia de los grandes terremotos peruanos.
5. **Distribución de magnitudes:** Proporción de sismos Leves, Moderados, Fuertes y Catastróficos.
*(Los gráficos se actualizan inmediatamente al añadir, editar o borrar registros).*

### 4. Laboratorio de Física Tectónica y Microscópica en 3D (Three.js + WebGL)
- **Navegación y Control de Cámara 3D (`OrbitControls`):**
  - **Rotación 360°:** Arrastra con el botón izquierdo del ratón para orbitar la escena tridimensional desde cualquier ángulo.
  - **Zoom Suave:** Utiliza la rueda del ratón para acercar o alejar la vista.
  - **Desplazamiento (Pan):** Arrastra con el botón derecho para desplazar el foco.
  - **Botón "Restablecer Cámara":** Retorna el encuadre 3D a la perspectiva óptima con un solo clic.
- **Botón "Cambiar vista":**
  - **Vista Macroscópica 3D (Subducción de Placas y Relieve de los Andes):** 
    - Bloque volumétrico de la **Placa de Nazca** descendiendo en ángulo de subducción (~25°) hacia el manto superior.
    - Océano Pacífico 3D translúcido y fosa submarina.
    - Bloque continental de la **Placa Sudamericana** con topografía en relieve: costa peruana (Lima/Callao con edificaciones 3D que oscilan durante el sismo), Cordillera de los Andes con cumbres nevadas y llanura amazónica.
    - Plano de contacto sismogénico con **mapa térmico de estrés en 3D** (de cian a rojo incandescente).
    - Fenómeno de **rebote elástico (*Stick-Slip*)**: Deformación continua y salto repentino de placas.
    - **Ondas sísmicas esféricas en 3D:** Expansión volumétrica de ondas primarias P (azules), secundarias S (rojas) y de superficie.
    - Sismógrafo superpuesto en tiempo real trazando la aceleración telúrica en superficie.
  - **Vista Microscópica 3D (Dentro de las rocas):**
    - Red cristalina tridimensional de átomos/partículas conectadas por resortes cilíndricos de Hooke.
    - Deformación por cizalla 3D bajo empuje tectónico ($U = \frac{1}{2} k \Delta x^2$).
    - Transmisión volumétrica de fonones y ondas acústicas de partícula a partícula sin falsas explosiones.
- **Controles de Física:** Fuerza de placas, fricción, resistencia de la roca, velocidad de simulación y botón para provocar rupturas manuales instantáneas.

---

## 5. Solución de Errores Más Comunes

| Problema | Causa Probable | Solución |
| :--- | :--- | :--- |
| `ModuleNotFoundError: No module named 'fastapi'` | Las dependencias no se instalaron en el intérprete activo de Python. | Ejecuta en la terminal de VS Code: `python -m pip install -r requirements.txt`. |
| `Error: [Errno 10048] address already in use` | El puerto `8000` ya está siendo ocupado por otra aplicación. | Ejecuta en otro puerto: `python -m uvicorn backend.main:app --port 8080 --reload` y abre `http://localhost:8080`. |
| El script PowerShell da error de directivas (`ExecutionPolicy`) al activar entornos | Restricción de seguridad por defecto de Windows PowerShell. | En la terminal de PowerShell escribe: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` o ejecuta simplemente `python run_app.py`. |
| El mapa aparece gris o incompleto al cambiar de pestaña | Leaflet necesita recalcular dimensiones al cambiar de pestaña oculta. | La aplicación cuenta con un método automático `invalidateSize()`. Si persiste, haz zoom in/out una vez en el mapa. |

---

## 6. Créditos y Fundamento Pedagógico

Desarrollado como proyecto pedagógico para integrar conceptos de:
- **Física Mecánica:** Elasticidad, ley de Hooke, ondas mecánicas longitudinales (P) y transversales (S), conversión de energía potencial a cinética.
- **Geología y Sismología:** Tectónica de placas, subducción de Nazca, fosa Perú-Chile, teoría del rebote elástico de Reid.
- **Estadística y Ciencia de Datos:** Distribución Gutenberg-Richter, análisis de recurrencia y visualización multidimensional.
