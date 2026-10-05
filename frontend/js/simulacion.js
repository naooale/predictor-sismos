/**
 * Motor de Simulación Física Sísmica 3D Interactivo (Three.js + WebGL)
 * Sistema de Estimación y Simulación de Riesgo Sísmico del Perú
 * 
 * 1. Escala Macroscópica 3D: Subducción Nazca-Sudamericana, relieve de los Andes, plano de falla,
 *    rebote elástico (Stick-Slip), ondas P/S esféricas volumétricas y sacudida de terreno.
 * 2. Escala Microscópica 3D: Red cristalina volumétrica de átomos enlazados por resortes elásticos,
 *    deformación por cizalla (Hooke), acumulación de energía potencial y propagación de fonones.
 */

// Estado del simulador
const simState = {
    activo: true,
    modo: 'macro', // 'macro' o 'micro'
    fuerza: 65,      // % de fuerza tectónica
    friccion: 70,    // % de fricción en la falla
    resistencia: 80, // Límite de rotura en MPa
    velocidad: 1.0,  // Multiplicador de tiempo
    
    // Variables dinámicas
    tension: 10.0,       // Tensión actual en MPa
    energiaPotencial: 0, // Joules
    ultimaMagnitud: null,
    estadoFalla: 'acumulando', // 'acumulando', 'ruptura', 'relajacion'
    tiempoRuptura: 0,
    reboteOffset: 0,
    
    // Ondas 3D activas
    ondas3D: [],
    
    // Datos del sismógrafo 2D overlay
    historialSismo: new Array(180).fill(0),
    aceleracionActual: 0
};

// Componentes Three.js
let scene, camera, renderer, controls;
let container3D;
let macroGroup, microGroup;

// Objetos 3D Macroscópicos
let placaNazca, placaSudamericana, planoFalla, luzFalla, oceano3D, edificiosGrupo;
let posOriginalSudam = { y: 0, z: 0 };

// Objetos 3D Microscópicos
let nodosMicro = [];
let enlacesMicro = [];
const GRID_X = 7;
const GRID_Y = 4;
const GRID_Z = 6;
const SPACING = 3.5;

// Sismógrafo
let canvasSeismo, ctxSeismo;
let animFrameId = null;

function inicializarSimulador() {
    container3D = document.getElementById("webglContainer");
    canvasSeismo = document.getElementById("seismoCanvas");

    if (!container3D || !canvasSeismo) return;
    ctxSeismo = canvasSeismo.getContext("2d");

    const width = container3D.clientWidth || 800;
    const height = container3D.clientHeight || 460;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    scene.fog = new THREE.FogExp2(0x070b14, 0.009);

    camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
    camera.position.set(-30, 28, 65);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container3D.innerHTML = "";
    container3D.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.minDistance = 25;
    controls.maxDistance = 150;
    controls.target.set(0, 0, 0);

    configurarIluminacion();
    construirEscenaMacroscopica();
    construirEscenaMicroscopica();
    configurarControlesSimulacion();

    window.addEventListener("resize", onWindowResize);

    if (animFrameId) cancelAnimationFrame(animFrameId);
    bucleRenderizado3D();
}

function configurarIluminacion() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.95);
    dirLight.position.set(-40, 60, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
    fillLight.position.set(40, -20, -30);
    scene.add(fillLight);

    luzFalla = new THREE.PointLight(0x00e5ff, 2, 45);
    luzFalla.position.set(-4, -2, 0);
    scene.add(luzFalla);
}

function construirEscenaMacroscopica() {
    macroGroup = new THREE.Group();

    // 1. PLACA DE NAZCA
    const nazcaShape = new THREE.Shape();
    nazcaShape.moveTo(-55, 0);
    nazcaShape.lineTo(-5, 0);
    nazcaShape.lineTo(25, -28);
    nazcaShape.lineTo(18, -38);
    nazcaShape.lineTo(-12, -10);
    nazcaShape.lineTo(-55, -10);
    nazcaShape.closePath();

    const extrudeSettings = { depth: 36, bevelEnabled: false };
    const nazcaGeo = new THREE.ExtrudeGeometry(nazcaShape, extrudeSettings);
    nazcaGeo.center();

    const nazcaMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.65,
        metalness: 0.25,
        wireframe: false
    });

    placaNazca = new THREE.Mesh(nazcaGeo, nazcaMat);
    placaNazca.position.set(-18, -7, 0);
    macroGroup.add(placaNazca);

    const gridNazca = new THREE.GridHelper(36, 12, 0x38bdf8, 0x1e3a8a);
    gridNazca.position.set(-35, 0.1, 0);
    macroGroup.add(gridNazca);

    const dirFlecha = new THREE.Vector3(1, -0.15, 0).normalize();
    const flechaNazca = new THREE.ArrowHelper(dirFlecha, new THREE.Vector3(-48, 4, 0), 16, 0x38bdf8, 3.5, 2.5);
    macroGroup.add(flechaNazca);

    // 2. OCÉANO PACÍFICO
    const oceanoGeo = new THREE.BoxGeometry(45, 1.2, 36);
    const oceanoMat = new THREE.MeshStandardMaterial({
        color: 0x1d4ed8,
        transparent: true,
        opacity: 0.55,
        roughness: 0.15,
        metalness: 0.8
    });
    oceano3D = new THREE.Mesh(oceanoGeo, oceanoMat);
    oceano3D.position.set(-32, -0.6, 0);
    macroGroup.add(oceano3D);

    // 3. PLACA SUDAMERICANA
    const continShape = new THREE.Shape();
    continShape.moveTo(-5, 0);
    continShape.lineTo(4, 1.2);
    continShape.lineTo(14, 8.5);
    continShape.lineTo(20, 6.0);
    continShape.lineTo(28, 10.2);
    continShape.lineTo(46, 2.0);
    continShape.lineTo(46, -30);
    continShape.lineTo(24, -30);
    continShape.lineTo(-5, 0);
    continShape.closePath();

    const continGeo = new THREE.ExtrudeGeometry(continShape, { depth: 36, bevelEnabled: false });
    continGeo.center();

    const continMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.8,
        metalness: 0.15,
        flatShading: true
    });

    placaSudamericana = new THREE.Mesh(continGeo, continMat);
    placaSudamericana.position.set(20, -7.5, 0);
    posOriginalSudam.y = placaSudamericana.position.y;
    posOriginalSudam.z = placaSudamericana.position.z;
    macroGroup.add(placaSudamericana);

    // Nevados andinos
    const nevadoGeo = new THREE.ConeGeometry(4.5, 6, 4);
    const nevadoMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const picoAndes1 = new THREE.Mesh(nevadoGeo, nevadoMat);
    picoAndes1.position.set(16, 5.5, -6);
    macroGroup.add(picoAndes1);

    const picoAndes2 = new THREE.Mesh(nevadoGeo, nevadoMat);
    picoAndes2.position.set(26, 7.5, 4);
    macroGroup.add(picoAndes2);

    // 4. PLANO DE FALLA
    const fallaGeo = new THREE.PlaneGeometry(16, 32);
    const fallaMat = new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        emissive: 0x00e5ff,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        side: THREE.DoubleSide
    });
    planoFalla = new THREE.Mesh(fallaGeo, fallaMat);
    planoFalla.rotation.y = Math.PI / 2;
    planoFalla.rotation.x = -Math.PI / 6;
    planoFalla.position.set(-2.5, -4.5, 0);
    macroGroup.add(planoFalla);

    // 5. EDIFICIOS 3D EN LA COSTA
    edificiosGrupo = new THREE.Group();
    const matEdif1 = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
    const matEdif2 = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4 });

    const edif1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5.5, 2.2), matEdif1);
    edif1.position.set(4, 2.75, -2);
    edificiosGrupo.add(edif1);

    const edif2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 8.0, 2.6), matEdif2);
    edif2.position.set(6, 4.0, 1.5);
    edificiosGrupo.add(edif2);

    const edif3 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 4.0, 1.8), matEdif1);
    edif3.position.set(5.5, 2.0, -5);
    edificiosGrupo.add(edif3);

    macroGroup.add(edificiosGrupo);

    scene.add(macroGroup);
}

function construirEscenaMicroscopica() {
    microGroup = new THREE.Group();
    microGroup.visible = false;

    nodosMicro = [];
    enlacesMicro = [];

    const sphereGeo = new THREE.SphereGeometry(0.48, 16, 16);
    const nodeMatBase = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.3,
        metalness: 0.5
    });

    const startX = -((GRID_X - 1) * SPACING) / 2;
    const startY = -((GRID_Y - 1) * SPACING) / 2;
    const startZ = -((GRID_Z - 1) * SPACING) / 2;

    for (let x = 0; x < GRID_X; x++) {
        for (let y = 0; y < GRID_Y; y++) {
            for (let z = 0; z < GRID_Z; z++) {
                const px = startX + x * SPACING;
                const py = startY + y * SPACING;
                const pz = startZ + z * SPACING;

                const esZonaFalla = x === 3;

                const nodoMat = esZonaFalla
                    ? new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.5, roughness: 0.2 })
                    : nodeMatBase.clone();

                const mesh = new THREE.Mesh(sphereGeo, nodoMat);
                mesh.position.set(px, py, pz);
                microGroup.add(mesh);

                nodosMicro.push({
                    mesh: mesh,
                    basePos: new THREE.Vector3(px, py, pz),
                    currPos: new THREE.Vector3(px, py, pz),
                    vel: new THREE.Vector3(0, 0, 0),
                    gridX: x,
                    gridY: y,
                    gridZ: z,
                    esFalla: esZonaFalla
                });
            }
        }
    }

    const cylGeo = new THREE.CylinderGeometry(0.08, 0.08, 1, 8);
    const cylMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.75 });

    function getIndex(gx, gy, gz) {
        if (gx < 0 || gx >= GRID_X || gy < 0 || gy >= GRID_Y || gz < 0 || gz >= GRID_Z) return -1;
        return (gx * GRID_Y * GRID_Z) + (gy * GRID_Z) + gz;
    }

    for (let i = 0; i < nodosMicro.length; i++) {
        const n1 = nodosMicro[i];

        if (n1.gridX < GRID_X - 1) {
            const i2 = getIndex(n1.gridX + 1, n1.gridY, n1.gridZ);
            if (i2 !== -1) crearEnlace(n1, nodosMicro[i2], cylGeo, cylMat);
        }
        if (n1.gridY < GRID_Y - 1) {
            const i2 = getIndex(n1.gridX, n1.gridY + 1, n1.gridZ);
            if (i2 !== -1) crearEnlace(n1, nodosMicro[i2], cylGeo, cylMat);
        }
        if (n1.gridZ < GRID_Z - 1) {
            const i2 = getIndex(n1.gridX, n1.gridY, n1.gridZ + 1);
            if (i2 !== -1) crearEnlace(n1, nodosMicro[i2], cylGeo, cylMat);
        }
    }

    scene.add(microGroup);
}

function crearEnlace(n1, n2, geo, mat) {
    const mesh = new THREE.Mesh(geo, mat.clone());
    microGroup.add(mesh);
    enlacesMicro.push({ mesh, n1, n2 });
}

function actualizarEnlacesMicro() {
    const vY = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < enlacesMicro.length; i++) {
        const e = enlacesMicro[i];
        const p1 = e.n1.currPos;
        const p2 = e.n2.currPos;

        const dir = new THREE.Vector3().subVectors(p2, p1);
        const dist = dir.length();
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

        e.mesh.position.copy(mid);
        e.mesh.scale.set(1, dist, 1);

        dir.normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(vY, dir);
        e.mesh.setRotationFromQuaternion(quat);

        const deformacion = Math.abs(dist - SPACING) / SPACING;
        const tensionRelativa = Math.min(1.0, simState.tension / simState.resistencia);

        if (e.mesh.material) {
            if (tensionRelativa > 0.8 || deformacion > 0.12) {
                e.mesh.material.color.setHex(0xef4444);
            } else if (tensionRelativa > 0.5 || deformacion > 0.06) {
                e.mesh.material.color.setHex(0xf59e0b);
            } else {
                e.mesh.material.color.setHex(0x38bdf8);
            }
        }
    }
}

function dispararRuptura3D() {
    simState.estadoFalla = 'ruptura';
    simState.tiempoRuptura = 70;

    const energiaLiberada = Math.pow(simState.tension, 2.3) * 1.5e12;
    simState.energiaPotencial = energiaLiberada;

    const magEquivalente = Math.min(9.2, Math.max(5.0, (2/3) * Math.log10(energiaLiberada) - 2.8)).toFixed(1);
    simState.ultimaMagnitud = magEquivalente;

    const hipo = simState.modo === 'macro'
        ? new THREE.Vector3(-2.5, -4.5, 0)
        : new THREE.Vector3(0, 0, 0);

    // 1. ONDA P 3D (Primaria)
    crearEsferaOnda3D(hipo, 0x38bdf8, 1.2, 0.45, 'P');

    // 2. ONDA S 3D (Secundaria)
    setTimeout(() => {
        crearEsferaOnda3D(hipo, 0xef4444, 0.75, 0.65, 'S');
    }, 140);

    // 3. ONDAS SUPERFICIALES
    setTimeout(() => {
        crearEsferaOnda3D(hipo, 0xf59e0b, 0.5, 0.75, 'Superficial');
    }, 300);

    nodosMicro.forEach(n => {
        const dist = n.currPos.distanceTo(hipo) + 1;
        const impulso = (simState.tension / dist) * 1.8;
        n.vel.x += (Math.random() - 0.5) * impulso * 2.0;
        n.vel.y += (Math.random() - 0.5) * impulso * 2.0;
        n.vel.z += (Math.random() - 0.5) * impulso * 2.0;
    });

    simState.aceleracionActual = parseFloat(magEquivalente) * 5.0;

    const badge = document.getElementById("eventBadge");
    if (badge) {
        badge.textContent = `💥 ¡RUPTURA SÍSMICA 3D! (Mw ${magEquivalente})`;
        badge.style.backgroundColor = "rgba(239, 68, 68, 0.35)";
        badge.style.borderColor = "#ef4444";
        badge.style.color = "#fca5a5";
    }
}

function crearEsferaOnda3D(origen, colorHex, velocidad, opacidadInicial, tipo) {
    const geo = new THREE.SphereGeometry(1, 24, 24);
    const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        wireframe: true,
        transparent: true,
        opacity: opacidadInicial
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origen);
    scene.add(mesh);

    simState.ondas3D.push({
        mesh: mesh,
        velocidad: velocidad,
        radio: 1,
        opacidad: opacidadInicial,
        tipo: tipo
    });
}

function bucleRenderizado3D() {
    animFrameId = requestAnimationFrame(bucleRenderizado3D);

    actualizarFisica3D();
    actualizarOndas3D();

    if (simState.modo === 'micro') {
        actualizarParticulasMicro3D();
        actualizarEnlacesMicro();
    }

    controls.update();
    renderer.render(scene, camera);

    renderizarSismografoOverlay();
}

function actualizarFisica3D() {
    if (!simState.activo) return;

    const tensionMax = simState.resistencia;
    const factorEsfuerzo = simState.tension / tensionMax;

    if (simState.estadoFalla === 'acumulando') {
        const incremento = (simState.fuerza * 0.16 + simState.friccion * 0.08) * simState.velocidad * 0.04;
        simState.tension += incremento;

        simState.aceleracionActual = (Math.random() - 0.5) * 0.5;

        if (simState.tension >= tensionMax) {
            dispararRuptura3D();
        }

        if (planoFalla && luzFalla) {
            if (factorEsfuerzo < 0.5) {
                planoFalla.material.color.setHex(0x00e5ff);
                luzFalla.color.setHex(0x00e5ff);
            } else if (factorEsfuerzo < 0.8) {
                planoFalla.material.color.setHex(0xf59e0b);
                luzFalla.color.setHex(0xf59e0b);
            } else {
                planoFalla.material.color.setHex(0xef4444);
                luzFalla.color.setHex(0xef4444);
            }
            planoFalla.material.emissiveIntensity = 0.4 + factorEsfuerzo * 1.2;
            luzFalla.intensity = 1.5 + factorEsfuerzo * 3.5;
        }

        if (placaSudamericana) {
            placaSudamericana.position.y = posOriginalSudam.y - factorEsfuerzo * 0.8;
        }

        const badge = document.getElementById("eventBadge");
        if (badge) {
            const pct = Math.round(factorEsfuerzo * 100);
            badge.textContent = `ESTADO: ACUMULANDO TENSIÓN (${pct}%)`;
            badge.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
            badge.style.borderColor = "rgba(59, 130, 246, 0.4)";
            badge.style.color = "#93c5fd";
        }
    } else if (simState.estadoFalla === 'ruptura') {
        simState.tiempoRuptura--;

        const temblor = (Math.random() - 0.5) * (simState.tiempoRuptura * 0.08);
        if (placaSudamericana) {
            placaSudamericana.position.y = posOriginalSudam.y + temblor;
            placaSudamericana.position.z = posOriginalSudam.z + (Math.random() - 0.5) * (simState.tiempoRuptura * 0.05);
        }

        if (edificiosGrupo) {
            edificiosGrupo.children.forEach(b => {
                b.rotation.z = (Math.random() - 0.5) * 0.12 * (simState.tiempoRuptura / 70);
                b.rotation.x = (Math.random() - 0.5) * 0.08 * (simState.tiempoRuptura / 70);
            });
        }

        simState.tension = Math.max(8.0, simState.tension - 2.2);
        simState.aceleracionActual = (Math.random() - 0.5) * (simState.tiempoRuptura * 0.55);

        if (simState.tiempoRuptura <= 0) {
            simState.estadoFalla = 'acumulando';
            if (placaSudamericana) {
                placaSudamericana.position.y = posOriginalSudam.y;
                placaSudamericana.position.z = posOriginalSudam.z;
            }
            if (edificiosGrupo) {
                edificiosGrupo.children.forEach(b => {
                    b.rotation.set(0, 0, 0);
                });
            }
        }
    }

    actualizarTelemetriaUI();
}

function actualizarOndas3D() {
    for (let i = simState.ondas3D.length - 1; i >= 0; i--) {
        const o = simState.ondas3D[i];
        o.radio += o.velocidad * simState.velocidad * 0.9;
        o.mesh.scale.set(o.radio, o.radio, o.radio);

        o.opacidad *= 0.975;
        o.mesh.material.opacity = o.opacidad;

        if (o.opacidad < 0.02 || o.radio > 120) {
            scene.remove(o.mesh);
            o.mesh.geometry.dispose();
            o.mesh.material.dispose();
            simState.ondas3D.splice(i, 1);
        }
    }
}

function actualizarParticulasMicro3D() {
    const kResorte = 0.15;
    const amortiguamiento = 0.91;
    const tensionRelativa = simState.tension / simState.resistencia;
    const cizallaZ = (tensionRelativa) * 3.5;

    nodosMicro.forEach(n => {
        let targetX = n.basePos.x;
        let targetY = n.basePos.y;
        let targetZ = n.basePos.z;

        if (n.gridX < 3) {
            targetZ -= cizallaZ;
        } else if (n.gridX > 3) {
            targetZ += cizallaZ;
        }

        const fx = (targetX - n.currPos.x) * kResorte;
        const fy = (targetY - n.currPos.y) * kResorte;
        const fz = (targetZ - n.currPos.z) * kResorte;

        const jitter = (Math.random() - 0.5) * (0.04 + tensionRelativa * 0.15);

        n.vel.x = (n.vel.x + fx + jitter) * amortiguamiento;
        n.vel.y = (n.vel.y + fy + jitter) * amortiguamiento;
        n.vel.z = (n.vel.z + fz + jitter) * amortiguamiento;

        n.currPos.add(n.vel);
        n.mesh.position.copy(n.currPos);
    });
}

function configurarControlesSimulacion() {
    const btnIniciar = document.getElementById("btnIniciarSim");
    const btnPausar = document.getElementById("btnPausarSim");
    const btnReiniciar = document.getElementById("btnReiniciarSim") || document.getElementById("btnResetSim");
    const btnRuptura = document.getElementById("btnRupturaManual") || document.getElementById("btnDispararSismo");
    const btnCambiarVista = document.getElementById("btnCambiarVista");
    const btnResetCam = document.getElementById("btnResetCamera");

    const btnModoMacro = document.getElementById("btnModoMacro");
    const btnModoMicro = document.getElementById("btnModoMicro");

    if (btnModoMacro) {
        btnModoMacro.addEventListener("click", () => {
            if (simState.modo !== 'macro') alternarVistaSimulacion3D();
            btnModoMacro.classList.add("active");
            if (btnModoMicro) btnModoMicro.classList.remove("active");
        });
    }

    if (btnModoMicro) {
        btnModoMicro.addEventListener("click", () => {
            if (simState.modo !== 'micro') alternarVistaSimulacion3D();
            btnModoMicro.classList.add("active");
            if (btnModoMacro) btnModoMacro.classList.remove("active");
        });
    }

    const simFuerza = document.getElementById("simFuerza") || document.getElementById("sliderFuerza");
    const simFriccion = document.getElementById("simFriccion") || document.getElementById("sliderFriccion");
    const simResistencia = document.getElementById("simResistencia") || document.getElementById("sliderResistencia");
    const simVelocidad = document.getElementById("simVelocidad") || document.getElementById("sliderVelocidad");

    if (btnIniciar) btnIniciar.addEventListener("click", () => { simState.activo = true; });
    if (btnPausar) btnPausar.addEventListener("click", () => { simState.activo = false; });
    if (btnReiniciar) btnReiniciar.addEventListener("click", reiniciarSimulacion3D);
    if (btnRuptura) btnRuptura.addEventListener("click", () => {
        simState.tension = simState.resistencia + 1.0;
        dispararRuptura3D();
    });
    if (btnCambiarVista) btnCambiarVista.addEventListener("click", alternarVistaSimulacion3D);
    if (btnResetCam) btnResetCam.addEventListener("click", restablecerCamara3D);

    if (simFuerza) simFuerza.addEventListener("input", (e) => {
        simState.fuerza = parseFloat(e.target.value);
        const elVal = document.getElementById("valFuerza");
        if (elVal) elVal.textContent = `${simState.fuerza}%`;
    });

    if (simFriccion) simFriccion.addEventListener("input", (e) => {
        simState.friccion = parseFloat(e.target.value);
        const elVal = document.getElementById("valFriccion");
        if (elVal) elVal.textContent = `${simState.friccion}%`;
    });

    if (simResistencia) simResistencia.addEventListener("input", (e) => {
        simState.resistencia = parseFloat(e.target.value);
        const elVal = document.getElementById("valResistencia");
        if (elVal) elVal.textContent = `${simState.resistencia} MPa`;
    });

    if (simVelocidad) simVelocidad.addEventListener("input", (e) => {
        simState.velocidad = parseFloat(e.target.value);
        const elVal = document.getElementById("valVelocidad");
        if (elVal) elVal.textContent = `${simState.velocidad.toFixed(1)}x`;
    });
}

function alternarVistaSimulacion3D() {
    if (simState.modo === 'macro') {
        simState.modo = 'micro';
        macroGroup.visible = false;
        microGroup.visible = true;

        document.getElementById("switchText").textContent = "Cambiar a Vista Macroscópica 3D";
        document.getElementById("switchIcon").textContent = "🌎";
        document.getElementById("modeTitleHeading").textContent = "Vista Microscópica 3D: ¿Qué ocurre dentro de las rocas?";
        document.getElementById("modeTitleDesc").textContent = "Red cristalina 3D: enlaces elásticos de Hooke almacenando energía potencial y transmisión de fonones.";

        camera.position.set(0, 18, 38);
        controls.target.set(0, 0, 0);
    } else {
        simState.modo = 'macro';
        macroGroup.visible = true;
        microGroup.visible = false;

        document.getElementById("switchText").textContent = "Cambiar a Vista Microscópica 3D";
        document.getElementById("switchIcon").textContent = "🔬";
        document.getElementById("modeTitleHeading").textContent = "Vista Macroscópica 3D: Subducción y Ruptura de Placas";
        document.getElementById("modeTitleDesc").textContent = "Modelo 3D de la Placa de Nazca subduciendo bajo la Placa Sudamericana, relieve andino y ondas sísmicas volumétricas.";

        camera.position.set(-30, 28, 65);
        controls.target.set(0, 0, 0);
    }
}

function restablecerCamara3D() {
    if (simState.modo === 'macro') {
        camera.position.set(-30, 28, 65);
    } else {
        camera.position.set(0, 18, 38);
    }
    controls.target.set(0, 0, 0);
    controls.update();
}

function reiniciarSimulacion3D() {
    simState.tension = 6.0;
    simState.energiaPotencial = 0;
    simState.estadoFalla = 'acumulando';
    simState.historialSismo.fill(0);
    simState.aceleracionActual = 0;

    simState.ondas3D.forEach(o => {
        scene.remove(o.mesh);
        o.mesh.geometry.dispose();
        o.mesh.material.dispose();
    });
    simState.ondas3D = [];

    nodosMicro.forEach(n => {
        n.currPos.copy(n.basePos);
        n.vel.set(0, 0, 0);
        n.mesh.position.copy(n.basePos);
    });

    actualizarTelemetriaUI();
}

function onWindowResize() {
    if (!container3D || !renderer || !camera) return;

    const width = container3D.clientWidth;
    const height = container3D.clientHeight;

    if (width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
}

function renderizarSismografoOverlay() {
    if (!ctxSeismo || !canvasSeismo) return;

    const w = canvasSeismo.width;
    const h = canvasSeismo.height;
    const midY = h / 2;

    simState.historialSismo.shift();
    simState.historialSismo.push(simState.aceleracionActual);

    ctxSeismo.fillStyle = "#030508";
    ctxSeismo.fillRect(0, 0, w, h);

    ctxSeismo.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctxSeismo.lineWidth = 1;
    ctxSeismo.beginPath();
    ctxSeismo.moveTo(0, midY);
    ctxSeismo.lineTo(w, midY);
    ctxSeismo.stroke();

    ctxSeismo.strokeStyle = simState.estadoFalla === 'ruptura' ? "#ef4444" : "#10b981";
    ctxSeismo.lineWidth = 1.6;
    ctxSeismo.beginPath();

    const dx = w / simState.historialSismo.length;
    for (let i = 0; i < simState.historialSismo.length; i++) {
        const x = i * dx;
        const val = simState.historialSismo[i];
        const y = midY - val * 3.5;

        if (i === 0) ctxSeismo.moveTo(x, y);
        else ctxSeismo.lineTo(x, y);
    }
    ctxSeismo.stroke();
}

function actualizarTelemetriaUI() {
    const telStressVal = document.getElementById("telStressVal");
    const telStressGauge = document.getElementById("telStressGauge");
    const telEnergiaVal = document.getElementById("telEnergiaVal");
    const telMagnitud = document.getElementById("telMagnitudRuptura");

    // Nuevos elementos HUD overlay en modal 3D
    const hudEstado = document.getElementById("hudEstado");
    const hudTension = document.getElementById("hudTension");
    const hudEnergia = document.getElementById("hudEnergia");

    const joules = Math.pow(simState.tension, 2.2) * 2e12;

    if (hudEstado) {
        if (simState.estadoFalla === 'ruptura') {
            hudEstado.textContent = "💥 ¡Ruptura Sísmica!";
            hudEstado.style.color = "#ff334b";
        } else if (simState.tension / simState.resistencia > 0.85) {
            hudEstado.textContent = "⚠️ Tensión Crítica";
            hudEstado.style.color = "#ff6b35";
        } else {
            hudEstado.textContent = "Acumulando Deformación";
            hudEstado.style.color = "#20c997";
        }
    }

    if (hudTension) {
        hudTension.textContent = `${simState.tension.toFixed(1)} MPa`;
    }

    if (hudEnergia) {
        hudEnergia.textContent = `~${joules.toExponential(2)} J`;
    }

    if (telStressVal) {
        telStressVal.textContent = `${simState.tension.toFixed(1)} MPa`;
    }

    if (telStressGauge) {
        const pct = Math.min(100, Math.round((simState.tension / simState.resistencia) * 100));
        telStressGauge.style.width = `${pct}%`;
        telStressGauge.style.backgroundColor = pct > 85 ? 'var(--color-muy-alto)' : (pct > 60 ? 'var(--color-alto)' : 'var(--color-primary)');
    }

    if (telEnergiaVal) {
        telEnergiaVal.textContent = `~${joules.toExponential(1)} J`;
    }

    if (telMagnitud && simState.ultimaMagnitud) {
        telMagnitud.textContent = `${simState.ultimaMagnitud} Mw`;
    }
}
