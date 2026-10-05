/**
 * Módulo de Gráficos Interactivos (Chart.js)
 * Renderiza la distribución de probabilidad del Panel Científico
 */

let chartProbabilidades = null;

function configurarEstilosChartJS() {
    if (typeof Chart === "undefined") return;
    Chart.defaults.color = '#8b949e';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';
    Chart.defaults.font.family = "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif";
    Chart.defaults.font.size = 11;
}

function renderizarGraficoProbabilidades(zonas) {
    const canvas = document.getElementById("probChartCanvas");
    if (!canvas || typeof Chart === "undefined") return;

    configurarEstilosChartJS();

    if (chartProbabilidades) {
        chartProbabilidades.destroy();
    }

    // Ordenar zonas por probabilidad descendente
    const zonasOrdenadas = [...zonas].sort((a, b) => b.probabilidad - a.probabilidad);

    const labels = zonasOrdenadas.map(z => {
        // Abreviar el nombre para que encaje bien en el eje
        return z.nombre.replace("Costa Central - ", "")
                       .replace("Costa Sur - ", "")
                       .replace("Costa Norte - ", "")
                       .replace("Sur Extremo - ", "")
                       .replace("Sierra Central - ", "")
                       .replace("Sierra Sur - ", "")
                       .replace("Selva Alta - ", "")
                       .replace("Amazonía Norte - ", "");
    });

    const probabilidades = zonasOrdenadas.map(z => z.probabilidad);
    const colores = zonasOrdenadas.map(z => z.color || '#58a6ff');

    const ctx = canvas.getContext("2d");

    chartProbabilidades = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Probabilidad 7 Días (%)',
                data: probabilidades,
                backgroundColor: colores.map(c => c + 'cc'),
                borderColor: colores,
                borderWidth: 1.5,
                borderRadius: 4,
                barPercentage: 0.75
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // Barra horizontal para mejor legibilidad de nombres
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#161b22',
                    titleColor: '#f0f6fc',
                    bodyColor: '#8b949e',
                    borderColor: '#30363d',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function (context) {
                            return ` Probabilidad: ${context.parsed.x}% (M ≥ 4.5)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    min: 0,
                    max: 45,
                    ticks: {
                        callback: function (val) {
                            return val + '%';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                y: {
                    ticks: {
                        color: '#f0f6fc',
                        font: {
                            size: 10
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}
