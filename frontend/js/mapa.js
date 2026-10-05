/**
 * Módulo del Mapa Geoespacial Interactivo del Perú (Leaflet.js)
 * Estilo Quake Forecast AI / proximosismo.org
 * 
 * - Cartografía oscura de alta precisión (CartoDB Dark Matter)
 * - Zona de subducción y fosa tectónica de Nazca
 * - Círculos de influencia probabilística (~100 km) con auras pulsantes
 * - Epicentros de sismicidad reciente del IGP
 */

let mapaPeru = null;
let capaZonasPronostico = null;
let capaSismosRecientes = null;
let capaFosaTectonica = null;
let marcadorUltimoSismo = null;
let marcadorSeleccion = null;

// Diccionario en memoria de las capas de zonas por ID
const capasZonasPorId = {};

const CENTRO_PERU = [-9.5, -73.5];
const ZOOM_INICIAL = 6;

function inicializarMapa() {
    const mapElement = document.getElementById("peruMap");
    if (!mapElement) return;

    mapaPeru = L.map("peruMap", {
        center: CENTRO_PERU,
        zoom: ZOOM_INICIAL,
        minZoom: 4,
        maxZoom: 13,
        zoomControl: true
    });

    // Capa base CartoDB Dark Matter (con API Key)
    window.cartoApiKey = "cb1_48zr_1_a87b54ddf136657d68f5599a";
    window.mapaTileLayer = L.tileLayer(`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${window.cartoApiKey}`, {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> | Pronóstico Sísmico Perú',
        subdomains: "abcd",
        maxZoom: 19
    }).addTo(mapaPeru);
    // Grupos de capas
    capaFosaTectonica = L.layerGroup().addTo(mapaPeru);
    capaZonasPronostico = L.layerGroup().addTo(mapaPeru);
    capaSismosRecientes = L.layerGroup().addTo(mapaPeru);

    // Dibujar Fosa de Subducción Perú-Chile
    dibujarFosaSubduccion();

    // Evento de clic en mapa para capturar coordenadas en el estimador interactivo
    mapaPeru.on("click", function (e) {
        const { lat, lng } = e.latlng;
        capturarCoordenadasMapa(lat, lng);
    });
}

window.toggleMapTheme = function(isLight) {
    if (!mapaPeru || !window.mapaTileLayer) return;
    const style = isLight ? "light_all" : "dark_all";
    window.mapaTileLayer.setUrl(`https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png?key=${window.cartoApiKey}`);
};

function dibujarFosaSubduccion() {
    const coordenadasFosa = [
        [-3.2, -81.8],
        [-5.2, -82.0],
        [-7.5, -81.0],
        [-9.8, -79.8],
        [-12.2, -78.6],
        [-14.5, -77.2],
        [-16.8, -74.5],
        [-18.5, -72.0],
        [-20.2, -71.2]
    ];

    const polyline = L.polyline(coordenadasFosa, {
        color: "#ff4757",
        weight: 2.5,
        dashArray: "6, 8",
        opacity: 0.85
    }).addTo(capaFosaTectonica);

    polyline.bindTooltip(
        "<strong>Fosa Peruano-Chilena</strong><br>Zona de subducción de la Placa de Nazca (~63 mm/año)",
        { sticky: true, className: "fosa-tooltip" }
    );
}

function renderizarZonasPronostico(zonas) {
    if (!mapaPeru || !capaZonasPronostico) return;
    capaZonasPronostico.clearLayers();

    zonas.forEach(zona => {
        const { id, nombre, departamento, lat, lon, probabilidad, nivel_riesgo, color, radio_km, acoplamiento, ultimo_sismo, silencio_sismico, pga_estimado, descripcion } = zona;

        // Determinar clase de animación pulsante según el nivel
        let animClass = "";
        let fillOpacity = 0.14;
        if (nivel_riesgo === "Crítico") {
            animClass = "pulse-circle-critico";
            fillOpacity = 0.22;
        } else if (nivel_riesgo === "Muy Alto") {
            animClass = "pulse-circle-muy-alto";
            fillOpacity = 0.18;
        }

        // Círculo de influencia (radio en metros: 100 km = 100,000 m)
        const radioMetros = (radio_km || 100) * 1000;
        const circle = L.circle([lat, lon], {
            radius: radioMetros,
            color: color,
            fillColor: color,
            fillOpacity: fillOpacity,
            weight: 2,
            opacity: 0.85,
            className: animClass
        }).addTo(capaZonasPronostico);

        // Marcador central con icono estético
        const markerIcon = L.divIcon({
            className: "zone-epicenter-pin",
            html: `
                <div style="
                    background: ${color};
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    border: 2px solid #ffffff;
                    box-shadow: 0 0 12px ${color};
                    cursor: pointer;
                "></div>
            `,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });

        const marker = L.marker([lat, lon], { icon: markerIcon }).addTo(capaZonasPronostico);

        // Contenido del Popup
        const popupContent = `
            <div class="map-popup-inner">
                <div class="popup-header">
                    <div>
                        <div class="popup-zone-name">${nombre}</div>
                        <div style="font-size:0.72rem; color:#8b949e;">${departamento}</div>
                    </div>
                    <span class="popup-badge" style="background:${color}22; color:${color}; border:1px solid ${color};">
                        ${nivel_riesgo}
                    </span>
                </div>
                
                <div class="popup-prob-bar-wrap">
                    <div class="popup-prob-row">
                        <span style="color:#8b949e;">Probabilidad 7 Días:</span>
                        <strong style="color:${color}; font-family:monospace; font-size:0.85rem;">${probabilidad}%</strong>
                    </div>
                    <div class="popup-bar-bg">
                        <div class="popup-bar-fill" style="width:${Math.min(probabilidad, 100)}%; background:${color};"></div>
                    </div>
                </div>

                <div class="popup-meta-info">
                    <div><strong>Radio de influencia:</strong> ${radio_km} km</div>
                    <div><strong>Acoplamiento:</strong> ${acoplamiento}</div>
                    <div><strong>Último sismo relevante:</strong> ${ultimo_sismo}</div>
                    <div><strong>Silencio sísmico:</strong> ${silencio_sismico}</div>
                    <div><strong>Aceleración esperada (PGA):</strong> ${pga_estimado}</div>
                </div>

                <button class="popup-btn-action" onclick="enfocarEnSidebar('${id}')">
                    🔍 Ver Análisis en Panel
                </button>
            </div>
        `;

        circle.bindPopup(popupContent, { maxWidth: 320 });
        marker.bindPopup(popupContent, { maxWidth: 320 });

        // Guardar referencia para interacción bidireccional
        capasZonasPorId[id] = { circle, marker, lat, lon };
    });
}

function enfocarZonaEnMapa(zonaId) {
    const item = capasZonasPorId[zonaId];
    if (!item || !mapaPeru) return;

    mapaPeru.flyTo([item.lat, item.lon], 8, {
        animate: true,
        duration: 1.2
    });

    setTimeout(() => {
        item.circle.openPopup();
    }, 1300);
}

function marcarUltimoSismoIGP(sismo) {
    if (!mapaPeru || !sismo || !sismo.latitud || !sismo.longitud) return;

    if (marcadorUltimoSismo) {
        mapaPeru.removeLayer(marcadorUltimoSismo);
    }

    const iconoUltimo = L.divIcon({
        className: "latest-quake-beacon",
        html: `
            <div style="position:relative; width:28px; height:28px;">
                <div style="
                    position:absolute; width:100%; height:100%;
                    border-radius:50%; background:#ff334b; opacity:0.4;
                    animation: livePulse 1.2s infinite ease-in-out;
                "></div>
                <div style="
                    position:absolute; top:6px; left:6px; width:16px; height:16px;
                    border-radius:50%; background:#ff334b; border:2px solid #ffffff;
                    box-shadow: 0 0 14px #ff334b;
                "></div>
            </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });

    marcadorUltimoSismo = L.marker([sismo.latitud, sismo.longitud], {
        icon: iconoUltimo,
        zIndexOffset: 1000
    }).addTo(mapaPeru);

    const popupContent = `
        <div class="map-popup-inner">
            <div class="popup-header">
                <div>
                    <div class="popup-zone-name">🔴 ÚLTIMO SISMO REGISTRADO</div>
                    <div style="font-size:0.72rem; color:#8b949e;">${sismo.fecha} • ${sismo.hora_local}</div>
                </div>
                <span class="popup-badge" style="background:#ff334b22; color:#ff334b; border:1px solid #ff334b; font-size:0.9rem;">
                    M ${sismo.magnitud}
                </span>
            </div>
            <div class="popup-meta-info">
                <div><strong>Epicentro:</strong> ${sismo.epicentro}</div>
                <div><strong>Profundidad:</strong> ${sismo.profundidad_km} km</div>
                <div><strong>Intensidad:</strong> ${sismo.intensidad}</div>
                <div><strong>Coordenadas:</strong> ${sismo.latitud}°, ${sismo.longitud}°</div>
            </div>
            <a href="${sismo.enlace_igp}" target="_blank" class="popup-btn-action" style="text-decoration:none;">
                Reporte Oficial IGP ↗
            </a>
        </div>
    `;

    marcadorUltimoSismo.bindPopup(popupContent, { maxWidth: 300 });
}

function enfocarUltimoSismoEnMapa(sismo) {
    if (!mapaPeru || !sismo) return;
    mapaPeru.flyTo([sismo.latitud, sismo.longitud], 8.5, {
        animate: true,
        duration: 1.2
    });
    setTimeout(() => {
        if (marcadorUltimoSismo) marcadorUltimoSismo.openPopup();
    }, 1300);
}

function capturarCoordenadasMapa(lat, lng) {
    const latFormatted = lat.toFixed(4);
    const lngFormatted = lng.toFixed(4);

    const inputLat = document.getElementById("calcLat");
    const inputLng = document.getElementById("calcLon");

    if (inputLat && inputLng) {
        inputLat.value = latFormatted;
        inputLng.value = lngFormatted;
    }

    if (marcadorSeleccion) {
        mapaPeru.removeLayer(marcadorSeleccion);
    }

    const iconoSeleccion = L.divIcon({
        className: "custom-click-pin",
        html: `<div style="background-color:#58a6ff; width:12px; height:12px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 0 10px #58a6ff;"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });

    marcadorSeleccion = L.marker([lat, lng], { icon: iconoSeleccion }).addTo(mapaPeru);
}
