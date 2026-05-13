/* ============================================================
   ejercicios.js — Generador de ejercicios y análisis estadístico
   Depende de: estadistica.js, curva.js
   ============================================================ */

/* ── Clave de localStorage ────────────────────────────────── */
const CLAVE = 'historial-ejercicios';

/* ── Contextos temáticos ──────────────────────────────────────
   El generador elige uno al azar para construir el enunciado.
   Agregar más contextos aquí si se quieren más temas.
─────────────────────────────────────────────────────────────── */
const CONTEXTOS = [
  { tema: 'Logística',          variable: 'tiempo de entrega',         unidad: 'minutos'     },
  { tema: 'Educación',          variable: 'nota del examen',            unidad: 'puntos'      },
  { tema: 'Manufactura',        variable: 'peso del producto',          unidad: 'gramos'      },
  { tema: 'Tecnología',         variable: 'tiempo de respuesta',        unidad: 'milisegundos'},
  { tema: 'Salud',              variable: 'presión arterial sistólica', unidad: 'mmHg'        },
  { tema: 'Finanzas',           variable: 'salario mensual',            unidad: 'miles de $'  },
  { tema: 'Meteorología',       variable: 'temperatura diaria',         unidad: '°C'          },
  { tema: 'Telecomunicaciones', variable: 'velocidad de descarga',      unidad: 'Mbps'        },
];

/* ── Estado global del ejercicio actual ───────────────────── */
let ejercicioActual    = null; // objeto con todo el ejercicio generado
let opcionSeleccionada = null; // índice 0-3 de la opción que eligió el usuario

/* ============================================================
   SECCIÓN 1 — GENERADORES DE EJERCICIOS
   Cada generador retorna un objeto con:
   { tipo, badge, badgeClass, enunciado, opciones,
     correcto, pasos, z, zc, tail, rech }
   ============================================================ */

/* ── generarEjercicioZ ────────────────────────────────────────
   Prueba Z para una media. Genera parámetros aleatorios,
   calcula los estadísticos y arma el enunciado + pasos.
─────────────────────────────────────────────────────────────── */
function generarEjercicioZ() {
  const E   = window.Estadistica;
  const ctx = CONTEXTOS[Math.floor(Math.random() * CONTEXTOS.length)];

  /* Parámetros aleatorios dentro de rangos razonables */
  const mu0   = Math.round(50  + Math.random() * 100); // media hipotética: 50–150
  const sigma = Math.round(5   + Math.random() * 20);  // desviación: 5–25
  const n     = Math.round(20  + Math.random() * 80);  // muestra: 20–100
  const alpha = [0.01, 0.05, 0.10][Math.floor(Math.random() * 3)];
  const tail  = ['bilateral', 'derecha', 'izquierda'][Math.floor(Math.random() * 3)];

  /* x̄ se genera cerca de μ₀ para que haya casos de ambos lados */
  const xbar = Math.round((mu0 + (Math.random() - 0.5) * sigma * 2) * 10) / 10;

  /* Cálculos estadísticos con estadistica.js */
  const se   = E.calcularSE(sigma, n);
  const z    = E.calcularZ(mu0, xbar, sigma, n);
  const pval = E.calcularPvalor(z, tail);
  const zc   = E.calcularZcritico(alpha, tail);
  const rech = E.tomarDecision(pval, alpha);

  /* La respuesta correcta es la decisión estadística */
  const correcto  = rech ? 'Se rechaza H₀' : 'No se rechaza H₀';
  const nombreCola = { bilateral: 'bilateral', derecha: 'cola derecha', izquierda: 'cola izquierda' }[tail];

  /* 4 opciones: 1 correcta + 3 distractores plausibles, mezcladas */
  const opciones = mezclar([
    correcto,
    rech ? 'No se rechaza H₀' : 'Se rechaza H₀',      // opuesto directo
    `p-valor = ${(pval * 2).toFixed(4)} < α`,           // distractor numérico
    `Z = ${z.toFixed(2)} es el valor crítico`,          // confunde Z con Zc
  ]);

  const enunciado = `
    Se sabe que el <strong>${ctx.variable}</strong> en el sector de 
    <strong>${ctx.tema}</strong> tiene una media histórica de 
    <strong>μ₀ = ${mu0} ${ctx.unidad}</strong> y desviación estándar 
    <strong>σ = ${sigma} ${ctx.unidad}</strong>. Se toma una muestra de 
    <strong>n = ${n}</strong> observaciones con media muestral 
    <strong>x̄ = ${xbar} ${ctx.unidad}</strong>. Con <strong>α = ${alpha}</strong>, 
    realice una prueba <strong>${nombreCola}</strong> y determine la decisión.
  `;

  /* Los pasos se muestran después de verificar, como un solucionario */
  const pasos = [
    { label: 'Error estándar', formula: 'SE = σ / √n',                      valor: `${sigma} / √${n} = ${se.toFixed(4)}`                            },
    { label: 'Estadístico Z',  formula: 'Z = (x̄ − μ₀) / SE',               valor: `(${xbar} − ${mu0}) / ${se.toFixed(4)} = ${z.toFixed(4)}`         },
    { label: 'Z crítico',      formula: `Zc para α=${alpha} ${nombreCola}`,  valor: zc.toFixed(4)                                                      },
    { label: 'p-valor',        formula: `P según ${nombreCola}`,             valor: pval.toFixed(4)                                                    },
    { label: 'Decisión',       formula: `p-valor ${rech ? '<' : '≥'} α`,    valor: rech ? 'Se rechaza H₀' : 'No se rechaza H₀'                        },
  ];

  return { tipo: 'prueba_z', badge: 'Prueba Z', badgeClass: 'badge--z',
           enunciado, opciones, correcto, pasos, z, zc, tail, rech };
}

/* ── generarEjercicioIC ───────────────────────────────────────
   Intervalo de confianza para una media. La pregunta es:
   ¿cuál de estas 4 opciones es el IC correcto?
─────────────────────────────────────────────────────────────── */
function generarEjercicioIC() {
  const E   = window.Estadistica;
  const ctx = CONTEXTOS[Math.floor(Math.random() * CONTEXTOS.length)];

  const xbar      = Math.round(50  + Math.random() * 100);
  const sigma     = Math.round(5   + Math.random() * 20);
  const n         = Math.round(20  + Math.random() * 80);
  const confianza = [0.90, 0.95, 0.99][Math.floor(Math.random() * 3)];

  const ic = E.calcularIC(xbar, sigma, n, confianza);
  const pctConfianza = (confianza * 100).toFixed(0);

  const correcto = `[${ic.li.toFixed(2)}, ${ic.ls.toFixed(2)}]`;

  /* Distractores: intervalos con valores ligeramente distintos */
  const opciones = mezclar([
    correcto,
    `[${(ic.li - sigma * 0.3).toFixed(2)}, ${(ic.ls + sigma * 0.3).toFixed(2)}]`, // más ancho
    `[${(ic.li + ic.me * 0.5).toFixed(2)}, ${(ic.ls - ic.me * 0.5).toFixed(2)}]`, // más estrecho
    `[${(xbar - sigma / n).toFixed(2)},    ${(xbar + sigma / n).toFixed(2)}]`,     // usa σ/n en vez de SE
  ]);

  const enunciado = `
    El <strong>${ctx.variable}</strong> en el sector de 
    <strong>${ctx.tema}</strong> tiene desviación estándar conocida 
    <strong>σ = ${sigma} ${ctx.unidad}</strong>. Una muestra de 
    <strong>n = ${n}</strong> observaciones arroja media 
    <strong>x̄ = ${xbar} ${ctx.unidad}</strong>. Calcule el intervalo de 
    confianza al <strong>${pctConfianza}%</strong>.
  `;

  const pasos = [
    { label: 'Nivel de confianza', formula: `${pctConfianza}% → α = ${(1-confianza).toFixed(2)}`, valor: `Zα/2 = ${ic.zc.toFixed(4)}`                                    },
    { label: 'Error estándar',     formula: 'SE = σ / √n',                                         valor: `${sigma} / √${n} = ${ic.se.toFixed(4)}`                         },
    { label: 'Margen de error',    formula: 'ME = Zα/2 × SE',                                      valor: `${ic.zc.toFixed(4)} × ${ic.se.toFixed(4)} = ${ic.me.toFixed(4)}`},
    { label: 'Límite inferior',    formula: 'LI = x̄ − ME',                                        valor: `${xbar} − ${ic.me.toFixed(4)} = ${ic.li.toFixed(4)}`             },
    { label: 'Límite superior',    formula: 'LS = x̄ + ME',                                        valor: `${xbar} + ${ic.me.toFixed(4)} = ${ic.ls.toFixed(4)}`             },
  ];

  return { tipo: 'intervalo_confianza', badge: `IC ${pctConfianza}%`, badgeClass: 'badge--ic',
           enunciado, opciones, correcto, pasos,
           z: 0, zc: ic.zc, tail: 'bilateral', rech: false }; // para dibujar la curva
}

/* ── mezclar(arr) — Fisher-Yates ─────────────────────────────
   Reordena el arreglo aleatoriamente para que la respuesta
   correcta no siempre aparezca en el mismo botón.
─────────────────────────────────────────────────────────────── */
function mezclar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]; // intercambio de posiciones
  }
  return a;
}

/* ============================================================
   SECCIÓN 2 — CONTROL DEL EJERCICIO
   nuevoEjercicio → seleccionarOpcion → verificar
   ============================================================ */

/* ── nuevoEjercicio ───────────────────────────────────────────
   Genera un ejercicio nuevo y resetea toda la UI.
   70% probabilidad prueba Z, 30% IC.
─────────────────────────────────────────────────────────────── */
function nuevoEjercicio() {
  ejercicioActual    = Math.random() < 0.7 ? generarEjercicioZ() : generarEjercicioIC();
  opcionSeleccionada = null;

  /* Badge */
  const badge    = document.getElementById('badge-tipo');
  badge.textContent = ejercicioActual.badge;
  badge.className   = `badge ${ejercicioActual.badgeClass}`;

  /* Enunciado */
  document.getElementById('enunciado').innerHTML = ejercicioActual.enunciado;

  /* Resetear los 4 botones de opción */
  ejercicioActual.opciones.forEach((texto, i) => {
    const btn     = document.getElementById(`op-${i}`);
    btn.textContent = texto;
    btn.className   = 'opcion';
    btn.disabled    = false;
  });

  /* Resetear botón verificar, feedback, curva y pasos */
  document.getElementById('btn-verificar').disabled    = true;
  document.getElementById('feedback').className        = 'feedback';
  document.getElementById('curva-wrap').style.display  = 'none';
  document.getElementById('pasos-wrap').style.display  = 'none';
}

/* ── seleccionarOpcion(i) ────────────────────────────────────
   Marca la opción elegida y habilita el botón verificar.
─────────────────────────────────────────────────────────────── */
function seleccionarOpcion(i) {
  opcionSeleccionada = i;

  /* Quitar selección anterior y marcar la nueva */
  for (let k = 0; k < 4; k++) document.getElementById(`op-${k}`).classList.remove('seleccionada');
  document.getElementById(`op-${i}`).classList.add('seleccionada');

  document.getElementById('btn-verificar').disabled = false;
}

/* ── verificar ────────────────────────────────────────────────
   Compara la opción elegida con la correcta, colorea botones,
   muestra feedback, curva y pasos, y guarda el resultado.
─────────────────────────────────────────────────────────────── */
function verificar() {
  if (opcionSeleccionada === null) return;

  const respuesta  = ejercicioActual.opciones[opcionSeleccionada];
  const esCorrecta = respuesta === ejercicioActual.correcto;

  /* Colorear botones: verde el correcto, rojo el incorrecto elegido */
  for (let k = 0; k < 4; k++) {
    const btn = document.getElementById(`op-${k}`);
    btn.disabled = true;
    if (ejercicioActual.opciones[k] === ejercicioActual.correcto) btn.classList.add('correcta');
    else if (k === opcionSeleccionada && !esCorrecta)             btn.classList.add('incorrecta');
  }

  document.getElementById('btn-verificar').disabled = true;

  /* Feedback textual */
  const fb   = document.getElementById('feedback');
  fb.className   = `feedback visible ${esCorrecta ? 'feedback--correcto' : 'feedback--incorrecto'}`;
  fb.textContent = esCorrecta
    ? '✓ Correcto. Bien hecho.'
    : `✗ Incorrecto. La respuesta correcta es: ${ejercicioActual.correcto}`;

  /* Curva de la distribución */
  document.getElementById('curva-wrap').style.display = 'block';
  window.dibujarCurva('curva-ejercicio', ejercicioActual.z, ejercicioActual.zc, ejercicioActual.tail, ejercicioActual.rech);

  /* Pasos del procedimiento */
  document.getElementById('pasos-wrap').style.display  = 'block';
  document.getElementById('pasos').innerHTML = ejercicioActual.pasos.map((p, i) => `
    <div class="paso">
      <div class="paso__num">${i + 1}</div>
      <div class="paso__contenido">
        <div class="paso__label">${p.label}</div>
        <div class="paso__formula">${p.formula}</div>
        <div class="paso__valor">${p.valor}</div>
      </div>
    </div>
  `).join('');

  /* Guardar resultado y refrescar progreso */
  guardarEjercicio(esCorrecta);
  renderProgreso();
}

/* ============================================================
   SECCIÓN 3 — LOCALSTORAGE
   Guarda y lee el historial de ejercicios respondidos.
   Máximo 60 registros: al superar ese límite se elimina
   el más antiguo para guardar el nuevo.
   ============================================================ */

function guardarEjercicio(correcto) {
  const lista = JSON.parse(localStorage.getItem(CLAVE) || '[]');
  lista.unshift({ fecha: new Date().toISOString(), tipo: ejercicioActual.tipo, correcto });
  if (lista.length > 60) lista.pop(); // rotar: eliminar el más antiguo
  localStorage.setItem(CLAVE, JSON.stringify(lista));
}

function leerHistorial() {
  return JSON.parse(localStorage.getItem(CLAVE) || '[]');
}

/* ============================================================
   SECCIÓN 4 — ANÁLISIS ESTADÍSTICOS
   Cada función lee el historial, verifica que haya suficientes
   datos y escribe HTML en su contenedor correspondiente.
   ============================================================ */

/* ── renderProgreso ───────────────────────────────────────────
   Orquesta todos los análisis y las métricas globales.
   Se llama al verificar un ejercicio y al abrir la pestaña.
─────────────────────────────────────────────────────────────── */
function renderProgreso() {
  const lista     = leerHistorial();
  const n         = lista.length;
  const correctos = lista.filter(r => r.correcto).length;
  const precision = n > 0 ? correctos / n : 0;

  /* Métricas numéricas */
  document.getElementById('prog-total').textContent     = n;
  document.getElementById('prog-correctos').textContent = correctos;
  document.getElementById('prog-precision').textContent = n > 0 ? (precision * 100).toFixed(1) + '%' : '—';
  document.getElementById('prog-tema').textContent      = n > 0 ? (lista[0].tipo === 'prueba_z' ? 'Prueba Z' : 'IC') : '—';

  /* Barra de precisión */
  document.getElementById('prog-precision-pct').textContent = n > 0 ? (precision * 100).toFixed(1) + '%' : '0%';
  document.getElementById('barra-fill').style.width         = (precision * 100) + '%';

  renderAnalisis1(lista);
  renderAnalisis2(lista, n, correctos, precision);
  renderAnalisis3(lista, n, precision);
  renderAnalisis4(lista);
  renderHistorial(lista);
}

/* ── Análisis 1: Descriptivo ──────────────────────────────────
   Muestra la precisión por tipo de ejercicio con barras.
   No requiere mínimo de datos.
─────────────────────────────────────────────────────────────── */
function renderAnalisis1(lista) {
  const el = document.getElementById('analisis-1');
  if (lista.length === 0) { el.innerHTML = '<p class="analisis-aviso">Responde al menos 1 ejercicio.</p>'; return; }

  /* Agrupar por tipo y calcular precisión de cada grupo */
  const tipos = {
    'prueba_z':            { nombre: 'Prueba Z',                registros: [] },
    'intervalo_confianza': { nombre: 'Intervalo de confianza',  registros: [] },
  };
  lista.forEach(r => { if (tipos[r.tipo]) tipos[r.tipo].registros.push(r); });

  el.innerHTML = Object.values(tipos)
    .filter(t => t.registros.length > 0)
    .map(t => {
      const total    = t.registros.length;
      const aciertos = t.registros.filter(r => r.correcto).length;
      const pct      = ((aciertos / total) * 100).toFixed(1);
      return `
        <div style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span class="text-sm font-medium">${t.nombre}</span>
            <span class="text-sm font-mono">${aciertos}/${total} — ${pct}%</span>
          </div>
          <div class="barra-progreso">
            <div class="barra-progreso__fill" style="width:${pct}%"></div>
          </div>
        </div>`;
    }).join('');
}

/* ── Análisis 2: Prueba de hipótesis sobre el aprendizaje ─────
   Pregunta: ¿el usuario responde mejor que el azar?
   H₀: p = 0.50  H₁: p > 0.50  α = 0.05
   Prueba Z de una proporción, cola derecha.
   Requiere n ≥ 10 para ser estadísticamente válido.
─────────────────────────────────────────────────────────────── */
function renderAnalisis2(lista, n, correctos, pHat) {
  const el = document.getElementById('analisis-2');
  if (n < 10) { el.innerHTML = `<p class="analisis-aviso">Responde al menos 10 ejercicios (llevas ${n}).</p>`; return; }

  const E    = window.Estadistica;
  const p0   = 0.5; // proporción bajo H₀ (azar puro)

  /* Fórmula: Z = (p̂ - p₀) / √(p₀(1-p₀)/n) */
  const z    = (pHat - p0) / Math.sqrt((p0 * (1 - p0)) / n);
  const pval = E.calcularPvalor(z, 'derecha');
  const zc   = E.calcularZcritico(0.05, 'derecha'); // 1.6449
  const rech = E.tomarDecision(pval, 0.05);

const conclusion = rech
    ? '✓ Estás respondiendo significativamente mejor que el azar. Hay evidencia real de aprendizaje.'
    : pHat >= 0.60
      ? '◦ Tu precisión es buena, pero necesitas más ejercicios para confirmar el aprendizaje.'
      : pHat >= 0.50
        ? '◦ Estás por encima del azar, pero sin suficiente evidencia estadística aún.'
        : pHat >= 0.35
          ? '⚠ Estás respondiendo cerca del azar. Revisa los procedimientos de cada tema.'
          : '✗ Estás por debajo del azar. Es momento de repasar los conceptos desde cero.';
  el.innerHTML = `
    <div class="metricas" style="margin-bottom:16px;">
      <div class="metrica"><div class="metrica__label">p̂</div><div class="metrica__valor">${(pHat*100).toFixed(1)}%</div></div>
      <div class="metrica"><div class="metrica__label">Estadístico Z</div><div class="metrica__valor">${z.toFixed(4)}</div></div>
      <div class="metrica"><div class="metrica__label">p-valor</div><div class="metrica__valor">${pval.toFixed(4)}</div></div>
      <div class="metrica"><div class="metrica__label">Z crítico</div><div class="metrica__valor">${zc.toFixed(4)}</div></div>
    </div>
    <div class="canvas-wrapper" style="margin-bottom:12px;">
      <canvas id="curva-analisis2" style="height:140px;"></canvas>
    </div>
    <div class="veredicto ${rech ? 'veredicto--acepta' : 'veredicto--neutro'}">${conclusion}</div>
  `;

  window.dibujarCurva('curva-analisis2', z, zc, 'derecha', rech);
}

/* ── Análisis 3: Intervalo de confianza de la precisión ───────
   Pregunta: ¿entre qué valores está la verdadera precisión?
   IC 95% para una proporción: p̂ ± Z₀.₀₂₅ × √(p̂(1-p̂)/n)
   Requiere n ≥ 10.
─────────────────────────────────────────────────────────────── */
function renderAnalisis3(lista, n, pHat) {
  const el = document.getElementById('analisis-3');
  if (n < 10) { el.innerHTML = `<p class="analisis-aviso">Responde al menos 10 ejercicios (llevas ${n}).</p>`; return; }

  const zc = window.Estadistica.calcularZcritico(0.05, 'bilateral'); // 1.96
  const se = Math.sqrt((pHat * (1 - pHat)) / n);
  const me = zc * se;
  const li = Math.max(0, pHat - me); // no puede bajar de 0%
  const ls = Math.min(1, pHat + me); // no puede subir de 100%

  el.innerHTML = `
    <div class="metricas" style="margin-bottom:16px;">
      <div class="metrica"><div class="metrica__label">Límite inferior</div><div class="metrica__valor">${(li*100).toFixed(1)}%</div></div>
      <div class="metrica"><div class="metrica__label">Límite superior</div><div class="metrica__valor">${(ls*100).toFixed(1)}%</div></div>
    </div>
    <p class="text-sm text-muted">
      Con 95% de confianza, tu verdadera precisión está entre 
      <strong>${(li*100).toFixed(1)}%</strong> y <strong>${(ls*100).toFixed(1)}%</strong>.
      (n=${n}, p̂=${(pHat*100).toFixed(1)}%, ME=${(me*100).toFixed(1)}%)
    </p>
  `;
}

/* ── Análisis 4: Comparación Z vs IC ─────────────────────────
   Pregunta: ¿hay diferencia significativa entre los dos tipos?
   Prueba Z de diferencia de dos proporciones independientes.
   Requiere al menos 8 ejercicios de cada tipo.
─────────────────────────────────────────────────────────────── */
function renderAnalisis4(lista) {
  const el      = document.getElementById('analisis-4');
  const grupoZ  = lista.filter(r => r.tipo === 'prueba_z');
  const grupoIC = lista.filter(r => r.tipo === 'intervalo_confianza');

  if (grupoZ.length < 8 || grupoIC.length < 8) {
    el.innerHTML = `<p class="analisis-aviso">Necesitas al menos 8 de cada tipo.<br>Prueba Z: ${grupoZ.length}/8 · IC: ${grupoIC.length}/8</p>`;
    return;
  }

  const E  = window.Estadistica;
  const n1 = grupoZ.length;
  const n2 = grupoIC.length;
  const p1 = grupoZ.filter(r => r.correcto).length  / n1; // precisión en prueba Z
  const p2 = grupoIC.filter(r => r.correcto).length / n2; // precisión en IC

  /* Proporción combinada: necesaria para el denominador cuando H₀: p1 = p2 */
  const pComb = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se    = Math.sqrt(pComb * (1 - pComb) * (1/n1 + 1/n2));
  const z     = (p1 - p2) / se;
  const pval  = E.calcularPvalor(z, 'bilateral');
  const rech  = E.tomarDecision(pval, 0.05);

  const mejor     = p1 > p2 ? 'Prueba Z' : 'Intervalos de confianza';
  const conclusion = rech
    ? `✓ Hay diferencia significativa. Tienes mejor rendimiento en ${mejor}.`
    : '◦ No hay diferencia significativa entre los dos tipos.';

  el.innerHTML = `
    <div class="metricas" style="margin-bottom:16px;">
      <div class="metrica"><div class="metrica__label">Precisión Prueba Z</div><div class="metrica__valor">${(p1*100).toFixed(1)}%</div></div>
      <div class="metrica"><div class="metrica__label">Precisión IC</div><div class="metrica__valor">${(p2*100).toFixed(1)}%</div></div>
      <div class="metrica"><div class="metrica__label">Estadístico Z</div><div class="metrica__valor">${z.toFixed(4)}</div></div>
      <div class="metrica"><div class="metrica__label">p-valor</div><div class="metrica__valor">${pval.toFixed(4)}</div></div>
    </div>
    <div class="veredicto ${rech ? 'veredicto--acepta' : 'veredicto--neutro'}">${conclusion}</div>
  `;
}

/* ── renderHistorial ──────────────────────────────────────────
   Lista los últimos ejercicios con hora, tipo y resultado.
─────────────────────────────────────────────────────────────── */
function renderHistorial(lista) {
  const el = document.getElementById('historial-lista');
  if (lista.length === 0) { el.innerHTML = '<p class="analisis-aviso">Sin ejercicios respondidos aún.</p>'; return; }

  el.innerHTML = lista.map(r => {
    const hora   = new Date(r.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const nombre = r.tipo === 'prueba_z' ? 'Prueba Z' : 'IC';
    return `
      <div class="historial__item">
        <span class="historial__fecha">${hora}</span>
        <span class="historial__params">${nombre}</span>
        <span class="historial__decision ${r.correcto ? 'acepta' : 'rechaza'}">
          ${r.correcto ? 'Correcto' : 'Incorrecto'}
        </span>
      </div>`;
  }).join('');
}

/* ============================================================
   SECCIÓN 5 — EVENTOS Y ARRANQUE
   Conecta los elementos del HTML con las funciones de arriba.
   ============================================================ */

/* Clic en cualquiera de los 4 botones de opción */
for (let i = 0; i < 4; i++) {
  document.getElementById(`op-${i}`).addEventListener('click', () => seleccionarOpcion(i));
}

/* Botón verificar */
document.getElementById('btn-verificar').addEventListener('click', verificar);

/* Botón nuevo ejercicio */
document.getElementById('btn-nuevo').addEventListener('click', nuevoEjercicio);

/* Botón limpiar historial */
document.getElementById('btn-limpiar').addEventListener('click', () => {
  localStorage.removeItem(CLAVE);
  renderProgreso();
});

/* Pestañas: activa el panel correspondiente y refresca progreso */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('activo'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('activo'));
    tab.classList.add('activo');
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('activo');
    if (tab.dataset.tab === 'progreso') renderProgreso(); // actualizar al entrar
  });
});

/* Arranque: generar primer ejercicio y mostrar progreso inicial */
nuevoEjercicio();
renderProgreso();