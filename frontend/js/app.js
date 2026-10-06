/**
 * Controlador Principal de la Aplicación
 * Quake Forecast AI | Pronóstico Sísmico Perú (proximosismo.org)
 */

// Estado global de la aplicación
const AppState = {
    zonas: [],
    filtroRiesgo: 'all',
    busquedaTexto: '',
    ultimoSismo: null,
    zonaSeleccionadaId: null,
    simulador3DInicializado: false
};

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inicializar mapa Leaflet
    inicializarMapa();

    // 2. Cargar pronósticos de zonas y último sismo desde el backend
    cargarPronosticos();
    cargarUltimoSismoIGP();

    // 3. Configurar eventos de pestañas y controles
    configurarTabsSidebar();
    configurarFiltrosYBusqueda();
    configurarEstimadorInteractivo();
    configurarModales();
    configurarThemeToggle();
    configurarBotonActualizar();
    initMobileBottomSheet(); // Iniciar Swipe de panel móvil
});

function configurarBotonActualizar() {
    const btnActualizar = document.getElementById("btnActualizarDatos");
    if (!btnActualizar) return;
    btnActualizar.addEventListener("click", () => {
        // Visual feedback
        btnActualizar.classList.add("icon-spin");
        btnActualizar.style.opacity = "0.7";
        
        // Reload data
        Promise.all([
            cargarPronosticos(),
            cargarUltimoSismoIGP()
        ]).then(() => {
            btnActualizar.classList.remove("icon-spin");
            btnActualizar.style.opacity = "1";
            mostrarNotificacion("✅ Datos actualizados correctamente");
        }).catch(() => {
            btnActualizar.classList.remove("icon-spin");
            btnActualizar.style.opacity = "1";
            mostrarNotificacion("❌ Error al actualizar los datos");
        });
    });
}

function mostrarNotificacion(mensaje) {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;
    toast.textContent = mensaje;
    toast.classList.add("show");
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function configurarThemeToggle() {
    const btns = [document.getElementById("btnThemeToggle"), document.getElementById("mobileThemeToggle")];
    let isLight = false;
    
    btns.forEach(btn => {
        if (!btn) return;
        btn.addEventListener("click", () => {
            isLight = !isLight;
            if (isLight) {
                document.body.classList.add("light-theme");
                btns.forEach(b => { if(b) b.textContent = "🌙"; });
            } else {
                document.body.classList.remove("light-theme");
                btns.forEach(b => { if(b) b.textContent = "☀️"; });
            }
            
            if (window.toggleMapTheme) {
                window.toggleMapTheme(isLight);
            }
        });
    });
}

/* ==========================================================================
   CARGA DE DATOS DESDE EL BACKEND FASTAPI
   ========================================================================== */

async function cargarPronosticos() {
    const container = document.getElementById("zoneCardsContainer");
    const splash = document.getElementById("splashScreen");

    try {
        const respuesta = await fetch("/api/pronosticos");
        if (!respuesta.ok) throw new Error("Error en la respuesta del servidor");

        const data = await respuesta.json();
        procesarDatosPronostico(data);
        
        if (splash) {
            splash.style.opacity = "0";
            setTimeout(() => splash.style.display = "none", 500);
        }
    } catch (error) {
        console.error("Error al cargar pronósticos:", error);
        
        if (splash) {
            splash.innerHTML = `
                <span style="font-size: 3rem; margin-bottom: 20px;">❌</span>
                <h2 style="color: #ff334b; margin: 0;">Error de Conexión</h2>
                <p style="color: var(--text-secondary); text-align: center; max-width: 300px;">No se pudo conectar al servidor. Si está inactivo, Render puede tardar hasta 1 minuto en despertar.</p>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: var(--ua-orange); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: bold;">Reintentar</button>
            `;
        }
        
        if (container) {
            container.innerHTML = `
                <div class="loading-state" style="color:#ff6b35;">
                    <span>⚠️ No se pudieron cargar los pronósticos.</span>
                    <button class="topbar-btn" onclick="cargarPronosticos()">Reintentar</button>
                </div>
            `;
        }
    }
}

function procesarDatosPronostico(data) {
    AppState.zonas = data.zonas || [];
    const meta = data.metadata || {};

    // Actualizar metadatos en el encabezado del sidebar
    const elUpdateDate = document.getElementById("metaUpdate");
    const elValidity = document.getElementById("metaVigencia");
    if (elUpdateDate) elUpdateDate.textContent = meta.fecha_actualizacion || "Reciente";
    if (elValidity) elValidity.textContent = meta.ventana_validez || "Próximos 7 días";

    // Actualizar métricas del panel científico
    actualizarMetricasCientificas(meta, AppState.zonas);

    // Renderizar zonas en el mapa y en las tarjetas
    renderizarZonasPronostico(AppState.zonas);
    renderizarTarjetasZonas();
    renderizarGraficoProbabilidades(AppState.zonas);

    // Actualizar contadores de los filtros
    actualizarContadoresFiltros();
}

async function cargarUltimoSismoIGP() {
    try {
        const respuesta = await fetch("/api/ultimo-sismo-igp");
        if (!respuesta.ok) throw new Error("Error al obtener último sismo");

        const sismo = await respuesta.json();
        procesarUltimoSismo(sismo);
    } catch (error) {
        console.error("Error al cargar último sismo IGP:", error);
    }
}

function procesarUltimoSismo(sismo) {
    AppState.ultimoSismo = sismo;

    // Actualizar tarjeta flotante
    const magBadge = document.getElementById("quakeMagBadge");
    const locationEl = document.getElementById("quakeLocation");
    const depthEl = document.getElementById("quakeDepth");
    const dateTimeEl = document.getElementById("quakeDateTime");
    const timeAgoEl = document.getElementById("quakeTimeAgo");
    const linkEl = document.getElementById("quakeIgpLink");

    if (magBadge) magBadge.textContent = `M ${sismo.magnitud}`;
    if (locationEl) locationEl.textContent = sismo.epicentro;
    if (depthEl) depthEl.textContent = `${sismo.profundidad_km} km`;
    if (dateTimeEl) dateTimeEl.textContent = `${sismo.fecha} ${sismo.hora_local}`;
    if (timeAgoEl) timeAgoEl.textContent = sismo.hace_tiempo;
    if (linkEl && sismo.enlace_igp) linkEl.href = sismo.enlace_igp;

    // Marcar en el mapa
    marcarUltimoSismoIGP(sismo);

    // Botón o tarjeta para enfocar último sismo
    const widgetSismo = document.getElementById("ultimoSismoWidget");
    if (widgetSismo) {
        widgetSismo.onclick = () => enfocarUltimoSismoEnMapa(sismo);
        
        // AUTO OCULTAR EN MODO CELULAR (Comportamiento tipo notificación profesional)
        if (window.innerWidth <= 768) {
            // Animación suave de entrada original
            widgetSismo.style.transition = "opacity 0.8s ease, transform 0.8s ease";
            
            // Ocultar después de 6 segundos
            let autoHideTimer = setTimeout(() => {
                widgetSismo.style.opacity = "0";
                widgetSismo.style.transform = "translateY(-20px)"; // Se va para arriba solo
                setTimeout(() => widgetSismo.style.display = "none", 800);
            }, 6000);

            // GESTO: Deslizar a la izquierda para ocultar (Swipe to dismiss)
            let touchStartX = 0;
            let touchEndX = 0;

            widgetSismo.addEventListener('touchstart', e => {
                touchStartX = e.changedTouches[0].screenX;
            }, {passive: true});

            widgetSismo.addEventListener('touchend', e => {
                touchEndX = e.changedTouches[0].screenX;
                // Si deslizó hacia la izquierda más de 40px
                if (touchStartX - touchEndX > 40) {
                    clearTimeout(autoHideTimer); // Cancelar el timer automático
                    widgetSismo.style.transition = "opacity 0.3s ease, transform 0.3s ease";
                    widgetSismo.style.opacity = "0";
                    widgetSismo.style.transform = "translateX(-100px)"; // Se va para la izquierda
                    setTimeout(() => widgetSismo.style.display = "none", 300);
                }
            }, {passive: true});
        }
    }
}

// Función para colapsar/expandir el panel en celulares
window.toggleMobileSidebar = function() {
    const sidebar = document.querySelector('.right-sidebar');
    const toggleText = document.getElementById('sidebarToggleText');
    if (!sidebar) return;
    
    sidebar.classList.toggle('collapsed');
    
    if (sidebar.classList.contains('collapsed')) {
        toggleText.textContent = "Ver Pronósticos";
    } else {
        toggleText.textContent = "Ocultar Pronósticos";
    }
};
function actualizarMetricasCientificas(meta, zonas) {
    const elCount = document.getElementById("sciZonesCount");
    const elMax = document.getElementById("sciMaxProb");
    const elMaxZone = document.getElementById("sciMaxZone");
    const elAvg = document.getElementById("sciAvgProb");

    if (elCount) elCount.textContent = meta.zonas_evaluadas || zonas.length;
    if (elMax) elMax.textContent = `${meta.prob_maxima || 0}%`;
    if (elAvg) elAvg.textContent = `${meta.prob_promedio || 0}%`;

    // Encontrar la zona con mayor probabilidad
    if (zonas && zonas.length > 0) {
        const zonaTop = [...zonas].sort((a, b) => b.probabilidad - a.probabilidad)[0];
        if (elMaxZone && zonaTop) elMaxZone.textContent = zonaTop.nombre;
    }
}

/* ==========================================================================
   RENDERIZADO DE TARJETAS DE ZONAS (VISIÓN CIUDADANA)
   ========================================================================== */

function renderizarTarjetasZonas() {
    const container = document.getElementById("zoneCardsContainer");
    const statusEl = document.getElementById("zoneFilterStatus");
    if (!container) return;

    // Filtrar según el filtro de riesgo y la búsqueda por texto
    const filtro = AppState.filtroRiesgo;
    const busqueda = AppState.busquedaTexto.toLowerCase().trim();

    const zonasFiltradas = AppState.zonas.filter(z => {
        const coincideFiltro = (filtro === 'all') || (z.nivel_riesgo === filtro);
        const coincideBusqueda = !busqueda ||
            z.nombre.toLowerCase().includes(busqueda) ||
            z.departamento.toLowerCase().includes(busqueda) ||
            z.descripcion.toLowerCase().includes(busqueda);
        return coincideFiltro && coincideBusqueda;
    });

    if (statusEl) {
        statusEl.textContent = `Mostrando ${zonasFiltradas.length} de ${AppState.zonas.length} zonas evaluadas`;
    }

    if (zonasFiltradas.length === 0) {
        container.innerHTML = `
            <div class="loading-state">
                <span>No se encontraron zonas para los criterios seleccionados.</span>
            </div>
        `;
        return;
    }

    // Generar HTML de las tarjetas
    container.innerHTML = zonasFiltradas.map((zona, index) => {
        const isSelected = AppState.zonaSeleccionadaId === zona.id ? 'selected' : '';
        const num = index + 1;
        // La card del diseño clónico:
        return `
            <div class="zone-item ${isSelected}" id="card-${zona.id}" onclick="seleccionarZonaCard('${zona.id}')">
                <div class="z-row">
                    <div class="z-info">
                        <span class="z-index">#${num}</span>
                        <span class="z-name">${zona.nombre}</span>
                        <span class="z-pin">📍</span>
                    </div>
                    <div class="z-risk">
                        <span class="z-pct" style="color: ${zona.color};">${zona.probabilidad}%</span>
                        <div class="z-bar-bg">
                            <div class="z-bar-fill" style="width: ${Math.min(zona.probabilidad, 100)}%; background: ${zona.color};"></div>
                        </div>
                    </div>
                </div>
                <div class="z-meta-row">
                    <span class="z-mag-box">Magnitud est.: &ge; 4.0+</span>
                    <span class="z-coords">${zona.lat.toFixed(2)}°, ${zona.lon.toFixed(2)}°</span>
                </div>
            </div>
        `;
    }).join("");
}

function seleccionarZonaCard(zonaId) {
    AppState.zonaSeleccionadaId = zonaId;
    document.querySelectorAll(".zone-card").forEach(c => c.classList.remove("selected"));
    const targetCard = document.getElementById(`card-${zonaId}`);
    if (targetCard) targetCard.classList.add("selected");

    enfocarZonaEnMapa(zonaId);
}

function enfocarZona(zonaId) {
    seleccionarZonaCard(zonaId);
}

window.enfocarEnSidebar = function (zonaId) {
    // Cambiar a pestaña Visión Ciudadana
    const btnTab = document.querySelector('.tab-btn[data-tab="tab-ciudadana"]');
    if (btnTab) btnTab.click();

    // Resetear filtros para asegurar que sea visible
    AppState.filtroRiesgo = 'all';
    AppState.busquedaTexto = '';
    const inputSearch = document.getElementById("zoneSearchInput");
    if (inputSearch) inputSearch.value = "";
    
    const riskSelect = document.getElementById("riskFilterSelect");
    if (riskSelect) riskSelect.value = "all";

    renderizarTarjetasZonas();

    // Enfocar y hacer scroll a la tarjeta
    setTimeout(() => {
        const card = document.getElementById(`card-${zonaId}`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add("selected");
        }
    }, 200);
};

/* ==========================================================================
   FILTROS Y BÚSQUEDA
   ========================================================================== */

function configurarFiltrosYBusqueda() {
    const inputSearch = document.getElementById("zoneSearchInput");
    const riskSelect = document.getElementById("riskFilterSelect");

    if (inputSearch) {
        inputSearch.addEventListener("input", (e) => {
            AppState.busquedaTexto = e.target.value;
            renderizarTarjetasZonas();
        });
    }

    if (riskSelect) {
        riskSelect.addEventListener("change", (e) => {
            AppState.filtroRiesgo = e.target.value;
            renderizarTarjetasZonas();
        });
    }
}

function actualizarContadoresFiltros() {
    const zonas = AppState.zonas;
    const cAll = document.getElementById("countAll");
    if (cAll) cAll.textContent = zonas.length;
}

/* ==========================================================================
   GESTIÓN DE PESTAÑAS DEL SIDEBAR
   ========================================================================== */

function configurarTabsSidebar() {
    const tabs = document.querySelectorAll(".tab-btn");
    const panes = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const targetId = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove("active"));
            panes.forEach(p => {
                p.classList.remove("active");
                p.style.display = "none";
            });

            tab.classList.add("active");
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add("active");
                targetPane.style.display = "flex";
            }

            // Si se pasa al panel científico, redimensionar gráfico
            if (targetId === "tab-cientifico") {
                renderizarGraficoProbabilidades(AppState.zonas);
            }
        });
    });
}

/* ==========================================================================
   ESTIMADOR LIBRE INTERACTIVO
   ========================================================================== */

function configurarEstimadorInteractivo() {
    const sliderMag = document.getElementById("calcMag");
    const sliderProf = document.getElementById("calcProf");
    const valMag = document.getElementById("valMag");
    const valProf = document.getElementById("valProf");
    const form = document.getElementById("formEstimador");

    if (sliderMag && valMag) {
        sliderMag.addEventListener("input", () => valMag.textContent = `${sliderMag.value} Mw`);
    }
    if (sliderProf && valProf) {
        sliderProf.addEventListener("input", () => valProf.textContent = `${sliderProf.value} km`);
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btnCalc = document.getElementById("btnCalcularRiesgo");
            if (btnCalc) btnCalc.disabled = true;

            const region = document.getElementById("calcRegion").value;
            const lat = parseFloat(document.getElementById("calcLat").value);
            const lon = parseFloat(document.getElementById("calcLon").value);
            const mag = parseFloat(sliderMag.value);
            const prof = parseFloat(sliderProf.value);

            try {
                const resp = await fetch("/api/analizar-riesgo", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        magnitud: mag,
                        profundidad: prof,
                        latitud: lat,
                        longitud: lon,
                        region: region
                    })
                });

                if (!resp.ok) throw new Error("Error en el cálculo");
                const res = await resp.json();

                // Mostrar resultado
                const box = document.getElementById("calcResultBox");
                const badge = document.getElementById("resNivelBadge");
                const pct = document.getElementById("resPorcentaje");
                const bar = document.getElementById("resMeterBar");
                const exp = document.getElementById("resExplicacion");
                const ciudad = document.getElementById("resCiudad");
                const energia = document.getElementById("resEnergia");

                if (box) box.style.display = "block";
                if (badge) {
                    badge.textContent = `${res.color_riesgo} ${res.nivel_riesgo}`;
                    badge.style.background = res.nivel_riesgo === "Muy Alto" ? "rgba(255, 51, 75, 0.2)" :
                        res.nivel_riesgo === "Alto" ? "rgba(255, 107, 53, 0.2)" : "rgba(32, 201, 151, 0.2)";
                    badge.style.color = res.nivel_riesgo === "Muy Alto" ? "#ff334b" :
                        res.nivel_riesgo === "Alto" ? "#ff6b35" : "#20c997";
                }
                if (pct) pct.textContent = `${res.porcentaje_riesgo}%`;
                if (bar) {
                    bar.style.width = `${res.porcentaje_riesgo}%`;
                    bar.style.background = res.nivel_riesgo === "Muy Alto" ? "#ff334b" :
                        res.nivel_riesgo === "Alto" ? "#ff6b35" : "#20c997";
                }
                if (exp) exp.textContent = res.explicacion;
                if (ciudad) ciudad.textContent = `Centro urbano: ${res.ciudad_cercana} (~${res.distancia_ciudad_km} km)`;
                if (energia) energia.textContent = `Energía: ~${res.energia_estimada_joules.toExponential(2)} Joules`;

            } catch (err) {
                console.error("Error en estimación interactiva:", err);
                alert("Hubo un error al calcular el riesgo. Inténtelo nuevamente.");
            } finally {
                if (btnCalc) btnCalc.disabled = false;
            }
        });
    }
}

/* ==========================================================================
   GESTIÓN DE MODALES (3D, CATÁLOGO, GUÍA)
   ========================================================================== */

function configurarModales() {
    // 1. Modal 3D
    const btnOpen3D = document.getElementById("btnOpen3D");
    const btnClose3D = document.getElementById("btnClose3D");
    const modal3D = document.getElementById("modal3D");

    if (btnOpen3D && modal3D) {
        btnOpen3D.addEventListener("click", () => {
            modal3D.classList.add("open");
            // Inicializar o redimensionar simulador Three.js
            setTimeout(() => {
                if (!AppState.simulador3DInicializado) {
                    inicializarSimulador();
                    AppState.simulador3DInicializado = true;
                } else if (typeof onWindowResize === "function") {
                    onWindowResize();
                }
            }, 100);
        });
    }

    if (btnClose3D && modal3D) {
        btnClose3D.addEventListener("click", () => modal3D.classList.remove("open"));
    }

    // 2. Modal Catálogo SQLite
    const btnOpenCat = document.getElementById("btnOpenCatalog");
    const btnCloseCat = document.getElementById("btnCloseCatalog");
    const modalCat = document.getElementById("modalCatalog");

    if (btnOpenCat && modalCat) {
        btnOpenCat.addEventListener("click", () => {
            modalCat.classList.add("open");
            cargarCatalogoSismos();
        });
    }

    if (btnCloseCat && modalCat) {
        btnCloseCat.addEventListener("click", () => modalCat.classList.remove("open"));
    }

    // 3. Modal Guía
    const btnOpenGuide = document.getElementById("btnOpenGuide");
    const btnCloseGuide = document.getElementById("btnCloseGuide");
    const modalGuide = document.getElementById("modalGuide");

    if (btnOpenGuide && modalGuide) {
        btnOpenGuide.addEventListener("click", () => modalGuide.classList.add("open"));
    }

    if (btnCloseGuide && modalGuide) {
        btnCloseGuide.addEventListener("click", () => modalGuide.classList.remove("open"));
    }

    // 4. Modal Información Importante
    const btnOpenInfo = document.getElementById("btnOpenInfoImportante");
    const btnCloseInfo = document.getElementById("btnCloseInfoImportante");
    const modalInfo = document.getElementById("modalInfoImportante");

    if (btnOpenInfo && modalInfo) {
        btnOpenInfo.addEventListener("click", () => modalInfo.classList.add("open"));
    }

    if (btnCloseInfo && modalInfo) {
        btnCloseInfo.addEventListener("click", () => modalInfo.classList.remove("open"));
    }

    // 5. Toggle sidebar en dispositivos móviles
    const btnToggleSidebar = document.getElementById("btnToggleSidebar");
    const sidebar = document.getElementById("sidebar");
    if (btnToggleSidebar && sidebar) {
        btnToggleSidebar.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });
    }

    // Cerrar modales con tecla Escape o clic fuera
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open"));
        }
    });

    document.querySelectorAll(".modal-overlay").forEach(overlay => {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                overlay.classList.remove("open");
            }
        });
    });

    // Configurar formulario de nuevo sismo en el catálogo
    configurarFormularioNuevoSismo();
}

/* ==========================================================================
   GESTIÓN DEL CATÁLOGO HISTÓRICO (CRUD SQLITE)
   ========================================================================== */

let todosLosSismos = [];

async function cargarCatalogoSismos() {
    const tbody = document.getElementById("catalogTableBody");
    if (!tbody) return;

    try {
        const resp = await fetch("/api/sismos");
        if (!resp.ok) throw new Error("Error al obtener catálogo");

        todosLosSismos = await resp.json();
        renderizarTablaCatalogo(todosLosSismos);

        // Búsqueda en catálogo
        const searchInput = document.getElementById("catalogSearchInput");
        const magSelect = document.getElementById("catalogMinMag");

        const filtrarCatalogo = () => {
            const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
            const minMag = magSelect && magSelect.value ? parseFloat(magSelect.value) : 0;

            const filtrados = todosLosSismos.filter(s => {
                const matchText = !query || s.region.toLowerCase().includes(query) || s.fecha.includes(query);
                const matchMag = s.magnitud >= minMag;
                return matchText && matchMag;
            });
            renderizarTablaCatalogo(filtrados);
        };

        if (searchInput) searchInput.oninput = filtrarCatalogo;
        if (magSelect) magSelect.onchange = filtrarCatalogo;

    } catch (err) {
        console.error("Error al cargar catálogo:", err);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:#ff6b35;">Error al cargar registros históricos.</td></tr>`;
    }
}

function renderizarTablaCatalogo(sismos) {
    const tbody = document.getElementById("catalogTableBody");
    if (!tbody) return;

    if (sismos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No se encontraron sismos con los filtros actuales.</td></tr>`;
        return;
    }

    tbody.innerHTML = sismos.map(s => {
        const magColor = s.magnitud >= 8.0 ? '#ff334b' : s.magnitud >= 7.0 ? '#ff6b35' : s.magnitud >= 6.0 ? '#f7c948' : '#20c997';
        return `
            <tr>
                <td style="font-family:monospace;">${s.fecha} ${s.hora}</td>
                <td><strong>${s.region}</strong></td>
                <td><span style="color:${magColor}; font-weight:700; font-family:monospace;">M ${s.magnitud}</span></td>
                <td>${s.profundidad} km</td>
                <td style="font-size:0.72rem; color:#8b949e;">${s.latitud.toFixed(2)}°, ${s.longitud.toFixed(2)}°</td>
                <td style="font-size:0.75rem;">${s.descripcion || 'Sin observaciones'}</td>
                <td>
                    <button class="topbar-btn" style="padding:2px 6px; font-size:0.7rem; color:#ff334b;" onclick="eliminarSismo(${s.id})">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

function configurarFormularioNuevoSismo() {
    const btnOpen = document.getElementById("btnOpenNewSismo");
    const btnCancel = document.getElementById("btnCancelNewSismo");
    const wrap = document.getElementById("wrapNewSismoForm");
    const form = document.getElementById("formNuevoSismo");

    if (btnOpen && wrap) {
        btnOpen.addEventListener("click", () => {
            wrap.style.display = wrap.style.display === "none" ? "block" : "none";
        });
    }

    if (btnCancel && wrap) {
        btnCancel.addEventListener("click", () => {
            wrap.style.display = "none";
        });
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const nuevoSismo = {
                fecha: document.getElementById("newFecha").value,
                hora: document.getElementById("newHora").value,
                region: document.getElementById("newRegion").value,
                magnitud: parseFloat(document.getElementById("newMag").value),
                profundidad: parseFloat(document.getElementById("newProf").value),
                latitud: parseFloat(document.getElementById("newLat").value),
                longitud: parseFloat(document.getElementById("newLon").value),
                descripcion: document.getElementById("newDesc").value
            };

            try {
                const resp = await fetch("/api/sismos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(nuevoSismo)
                });

                if (!resp.ok) throw new Error("Error al guardar sismo");

                alert("Sismo registrado exitosamente en la base de datos.");
                form.reset();
                if (wrap) wrap.style.display = "none";
                cargarCatalogoSismos();

            } catch (err) {
                console.error("Error al crear sismo:", err);
                alert("Error al guardar sismo en la base de datos.");
            }
        });
    }
}

window.eliminarSismo = async function (id) {
    if (!confirm(`¿Estás seguro de eliminar el registro sísmico #${id}?`)) return;

    try {
        const resp = await fetch(`/api/sismos/${id}`, { method: "DELETE" });
        if (!resp.ok) throw new Error("Error al eliminar");
        cargarCatalogoSismos();
    } catch (err) {
        console.error("Error al eliminar sismo:", err);
        alert("No se pudo eliminar el sismo.");
    }
};

/* ==========================================================================
   GESTIÓN DE BOTTOM SHEET (MOBILE SWIPE GESTURE)
   ========================================================================== */
function initMobileBottomSheet() {
    const sidebar = document.querySelector('.right-sidebar');
    const handle = document.querySelector('.sidebar-toggle-mobile');
    if (!sidebar || !handle || window.innerWidth > 768) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let startHeight = 0;

    let wasCollapsed = false;

    handle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        startHeight = sidebar.getBoundingClientRect().height;
        isDragging = true;
        
        // Si estaba colapsado, le quitamos la clase temporalmente 
        // y fijamos la altura en 60 para que pueda crecer dinámicamente
        wasCollapsed = sidebar.classList.contains('collapsed');
        if (wasCollapsed) {
            sidebar.classList.remove('collapsed');
            sidebar.style.height = '60px';
        }
        
        // Quitar la transición para que siga al dedo instantáneamente y evitar scroll interno mientras arrastra
        sidebar.style.transition = 'none'; 
        sidebar.style.overflow = 'hidden';
    }, { passive: true });

    handle.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const deltaY = startY - currentY; // Positivo si arrastra hacia arriba
        let newHeight = startHeight + deltaY;
        
        // Limites (60px mínimo, 85vh máximo)
        const minHeight = 60;
        const maxHeight = window.innerHeight * 0.85; 
        
        if (newHeight < minHeight) newHeight = minHeight;
        if (newHeight > maxHeight) newHeight = maxHeight;

        sidebar.style.height = `${newHeight}px`;
    }, { passive: true });

    handle.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        // Restaurar la transición CSS suave y el overflow
        sidebar.style.transition = 'transform 0.3s ease, height 0.3s ease';
        sidebar.style.overflow = '';

        // Si fue solo un "tap" rápido sin mover el dedo, lo tratamos como un clic
        if (Math.abs(currentY - startY) < 10 || currentY === 0) {
            sidebar.style.height = ''; 
            if (wasCollapsed) {
                // Estaba cerrado, el tap lo abre
                sidebar.classList.remove('collapsed');
                document.getElementById('sidebarToggleText').textContent = "Ocultar Pronósticos";
            } else {
                // Estaba abierto, el tap lo cierra
                sidebar.classList.add('collapsed');
                document.getElementById('sidebarToggleText').textContent = "Ver Pronósticos";
            }
            currentY = 0;
            return;
        }

        const currentHeight = sidebar.getBoundingClientRect().height;
        const threshold = window.innerHeight * 0.35; // Umbral de decisión (35vh)
        
        // Limpiar el height en línea para que CSS controle el estado snap
        sidebar.style.height = ''; 

        if (currentHeight > threshold) {
            // Deslizó lo suficiente hacia arriba -> Expandir
            sidebar.classList.remove('collapsed');
            document.getElementById('sidebarToggleText').textContent = "Ocultar Pronósticos";
        } else {
            // Deslizó hacia abajo -> Colapsar
            sidebar.classList.add('collapsed');
            document.getElementById('sidebarToggleText').textContent = "Ver Pronósticos";
        }
        
        currentY = 0;
    });
}
