/* ============================================================
   ejercicios.js — Generador de ejercicios y análisis estadístico
   Depende de: estadistica.js, curva.js, auth.js, db.js
   ============================================================ */

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
let ejercicioActual    = null;
let opcionSeleccionada = null;

/* ============================================================
   SECCIÓN 1 — GENERADORES DE EJERCICIOS
   ============================================================ */

function generarEjercicioZ() {
  const E   = window.Estadistica;
  const ctx = CONTEXTOS[Math.floor(Math.random() * CONTEXTOS.length)];

  const mu0   = Math.round(50  + Math.random() * 100);
  const sigma = Math.round(5   + Math.random() * 20);
  const n     = Math.round(20  + Math.random() * 80);
  const alpha = [0.01, 0.05, 0.10][Math.floor(Math.random() * 3)];
  const tail  = ['bilateral', 'derecha', 'izquierda'][Math.floor(Math.random() * 3)];
  const xbar  = Math.round((mu0 + (Math.random() - 0.5) * sigma * 2) * 10) / 10;

  const se   = E.calcularSE(sigma, n);
  const z    = E.calcularZ(mu0, xbar, sigma, n);
  const pval = E.calcularPvalor(z, tail);
  const zc   = E.calcularZcritico(alpha, tail);
  const rech = E.tomarDecision(pval, alpha);

  const correcto   = rech ? 'Se rechaza H₀' : 'No se rechaza H₀';
  const nombreCola = { bilateral: 'bilateral', derecha: 'cola derecha', izquierda: 'cola izquierda' }[tail];

  const opciones = mezclar([
    correcto,
    rech ? 'No se rechaza H₀' : 'Se rechaza H₀',
    `p-valor = ${(pval * 2).toFixed(4)} < α`,
    `Z = ${z.toFixed(2)} es el valor crítico`,
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

  const pasos = [
    { label: 'Error estándar', formula: 'SE = σ / √n',                     valor: `${sigma} / √${n} = ${se.toFixed(4)}`                          },
    { label: 'Estadístico Z',  formula: 'Z = (x̄ − μ₀) / SE',              valor: `(${xbar} − ${mu0}) / ${se.toFixed(4)} = ${z.toFixed(4)}`       },
    { label: 'Z crítico',      formula: `Zc para α=${alpha} ${nombreCola}`, valor: zc.toFixed(4)                                                   },
    { label: 'p-valor',        formula: `P según ${nombreCola}`,            valor: pval.toFixed(4)                                                 },
    { label: 'Decisión',       formula: `p-valor ${rech ? '<' : '≥'} α`,   valor: rech ? 'Se rechaza H₀' : 'No se rechaza H₀'                     },
  ];

  return { tipo: 'prueba_z', badge: 'Prueba Z', badgeClass: 'badge--z',
           enunciado, opciones, correcto, pasos, z, zc, tail, rech };
}

function generarEjercicioIC() {
  const E   = window.Estadistica;
  const ctx = CONTEXTOS[Math.floor(Math.random() * CONTEXTOS.length)];

  const xbar      = Math.round(50  + Math.random() * 100);
  const sigma     = Math.round(5   + Math.random() * 20);
  const n         = Math.round(20  + Math.random() * 80);
  const confianza = [0.90, 0.95, 0.99][Math.floor(Math.random() * 3)];
  const ic        = E.calcularIC(xbar, sigma, n, confianza);
  const pct       = (confianza * 100).toFixed(0);

  const correcto = `[${ic.li.toFixed(2)}, ${ic.ls.toFixed(2)}]`;
  const opciones = mezclar([
    correcto,
    `[${(ic.li - sigma * 0.3).toFixed(2)}, ${(ic.ls + sigma * 0.3).toFixed(2)}]`,
    `[${(ic.li + ic.me * 0.5).toFixed(2)}, ${(ic.ls - ic.me * 0.5).toFixed(2)}]`,
    `[${(xbar - sigma / n).toFixed(2)},    ${(xbar + sigma / n).toFixed(2)}]`,
  ]);

  const enunciado = `
    El <strong>${ctx.variable}</strong> en el sector de 
    <strong>${ctx.tema}</strong> tiene desviación estándar conocida 
    <strong>σ = ${sigma} ${ctx.unidad}</strong>. Una muestra de 
    <strong>n = ${n}</strong> observaciones arroja media 
    <strong>x̄ = ${xbar} ${ctx.unidad}</strong>. Calcule el intervalo de 
    confianza al <strong>${pct}%</strong>.
  `;

  const pasos = [
    { label: 'Nivel de confianza', formula: `${pct}% → α = ${(1-confianza).toFixed(2)}`, valor: `Zα/2 = ${ic.zc.toFixed(4)}`                                     },
    { label: 'Error estándar',     formula: 'SE = σ / √n',                                valor: `${sigma} / √${n} = ${ic.se.toFixed(4)}`                          },
    { label: 'Margen de error',    formula: 'ME = Zα/2 × SE',                             valor: `${ic.zc.toFixed(4)} × ${ic.se.toFixed(4)} = ${ic.me.toFixed(4)}`},
    { label: 'Límite inferior',    formula: 'LI = x̄ − ME',                               valor: `${xbar} − ${ic.me.toFixed(4)} = ${ic.li.toFixed(4)}`              },
    { label: 'Límite superior',    formula: 'LS = x̄ + ME',                               valor: `${xbar} + ${ic.me.toFixed(4)} = ${ic.ls.toFixed(4)}`              },
  ];

  return { tipo: 'intervalo_confianza', badge: `IC ${pct}%`, badgeClass: 'badge--ic',
           enunciado, opciones, correcto, pasos,
           z: 0, zc: ic.zc, tail: 'bilateral', rech: false };
}

/* ── mezclar(arr) — Fisher-Yates ─────────────────────────────
   Reordena el arreglo aleatoriamente.
─────────────────────────────────────────────────────────────── */
function mezclar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ============================================================
   SECCIÓN 2 — CONTROL DEL EJERCICIO
   ============================================================ */

function nuevoEjercicio() {
  ejercicioActual    = Math.random() < 0.7 ? generarEjercicioZ() : generarEjercicioIC();
  opcionSeleccionada = null;

  const badge = document.getElementById('badge-tipo');
  badge.textContent = ejercicioActual.badge;
  badge.className   = `badge ${ejercicioActual.badgeClass}`;

  document.getElementById('enunciado').innerHTML = ejercicioActual.enunciado;

  ejercicioActual.opciones.forEach((texto, i) => {
    const btn     = document.getElementById(`op-${i}`);
    btn.textContent = texto;
    btn.className   = 'opcion';
    btn.disabled    = false;
  });

  document.getElementById('btn-verificar').disabled   = true;
  document.getElementById('feedback').className       = 'feedback';
  document.getElementById('curva-wrap').style.display = 'none';
  document.getElementById('pasos-wrap').style.display = 'none';
}

function seleccionarOpcion(i) {
  opcionSeleccionada = i;
  for (let k = 0; k < 4; k++) document.getElementById(`op-${k}`).classList.remove('seleccionada');
  document.getElementById(`op-${i}`).classList.add('seleccionada');
  document.getElementById('btn-verificar').disabled = false;
}

/* ── verificar ────────────────────────────────────────────────
   Verifica la respuesta, muestra feedback, curva y pasos,
   y guarda en Supabase via db.js.
─────────────────────────────────────────────────────────────── */
async function verificar() {
  if (opcionSeleccionada === null) return;

  const respuesta  = ejercicioActual.opciones[opcionSeleccionada];
  const esCorrecta = respuesta === ejercicioActual.correcto;

  for (let k = 0; k < 4; k++) {
    const btn = document.getElementById(`op-${k}`);
    btn.disabled = true;
    if (ejercicioActual.opciones[k] === ejercicioActual.correcto) btn.classList.add('correcta');
    else if (k === opcionSeleccionada && !esCorrecta)             btn.classList.add('incorrecta');
  }

  document.getElementById('btn-verificar').disabled = true;

  const fb = document.getElementById('feedback');
  fb.className   = `feedback visible ${esCorrecta ? 'feedback--correcto' : 'feedback--incorrecto'}`;
  fb.textContent = esCorrecta
    ? '✓ Correcto. Bien hecho.'
    : `✗ Incorrecto. La respuesta correcta es: ${ejercicioActual.correcto}`;

  document.getElementById('curva-wrap').style.display = 'block';
  window.dibujarCurva('curva-ejercicio', ejercicioActual.z, ejercicioActual.zc, ejercicioActual.tail, ejercicioActual.rech);

  document.getElementById('pasos-wrap').style.display = 'block';
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

  /* ── CAMBIO PRINCIPAL: guardar en Supabase via db.js ─────── */
  await guardarEjercicioDB(ejercicioActual.tipo, esCorrecta);

  /* Refrescar progreso leyendo desde Supabase */
  await renderProgreso();
}

/* ============================================================
   SECCIÓN 3 — LECTURA Y ESCRITURA
   Antes usaba localStorage, ahora usa db.js → Supabase.
   guardarEjercicioDB y obtenerMisEjerciciosDB vienen de db.js
   ============================================================ */

/* ── leerHistorial() ──────────────────────────────────────────
   Lee los ejercicios desde Supabase.
   Es async porque hace una petición a la red.
─────────────────────────────────────────────────────────────── */
async function leerHistorial() {
  return await obtenerMisEjerciciosDB(); // viene de db.js
}

/* ============================================================
   SECCIÓN 4 — ANÁLISIS ESTADÍSTICOS
   ============================================================ */

/* ── renderProgreso ───────────────────────────────────────────
   Ahora es async porque leerHistorial() hace fetch a Supabase.
─────────────────────────────────────────────────────────────── */
async function renderProgreso() {
  const lista     = await leerHistorial(); // ← await porque es async
  const n         = lista.length;
  const correctos = lista.filter(r => r.correcto).length;
  const precision = n > 0 ? correctos / n : 0;

  document.getElementById('prog-total').textContent     = n;
  document.getElementById('prog-correctos').textContent = correctos;
  document.getElementById('prog-precision').textContent = n > 0 ? (precision * 100).toFixed(1) + '%' : '—';
  document.getElementById('prog-tema').textContent      = n > 0 ? (lista[0].tema === 'prueba_z' ? 'Prueba Z' : 'IC') : '—';

  document.getElementById('prog-precision-pct').textContent = n > 0 ? (precision * 100).toFixed(1) + '%' : '0%';
  document.getElementById('barra-fill').style.width         = (precision * 100) + '%';

  renderAnalisis1(lista);
  renderAnalisis2(lista, n, correctos, precision);
  renderAnalisis3(lista, n, precision);
  renderAnalisis4(lista);
  renderHistorial(lista);
}

/* ── Análisis 1: Descriptivo ─────────────────────────────────
   Precisión por tipo de ejercicio con barras.
─────────────────────────────────────────────────────────────── */
function renderAnalisis1(lista) {
  const el = document.getElementById('analisis-1');
  if (lista.length === 0) { el.innerHTML = '<p class="analisis-aviso">Responde al menos 1 ejercicio.</p>'; return; }

  const tipos = {
    'prueba_z':            { nombre: 'Prueba Z',               registros: [] },
    'intervalo_confianza': { nombre: 'Intervalo de confianza', registros: [] },
  };

  /* Supabase devuelve 'tema', localStorage devolvía 'tipo'
     Aquí manejamos ambos por compatibilidad */
  lista.forEach(r => {
    const clave = r.tema || r.tipo;
    if (tipos[clave]) tipos[clave].registros.push(r);
  });

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
   H₀: p = 0.50  H₁: p > 0.50  α = 0.05
─────────────────────────────────────────────────────────────── */
function renderAnalisis2(lista, n, correctos, pHat) {
  const el = document.getElementById('analisis-2');
  if (n < 10) { el.innerHTML = `<p class="analisis-aviso">Responde al menos 10 ejercicios (llevas ${n}).</p>`; return; }

  const E  = window.Estadistica;
  const p0 = 0.5;
  const z    = (pHat - p0) / Math.sqrt((p0 * (1 - p0)) / n);
  const pval = E.calcularPvalor(z, 'derecha');
  const zc   = E.calcularZcritico(0.05, 'derecha');
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
   IC 95%: p̂ ± Z₀.₀₂₅ × √(p̂(1-p̂)/n)
─────────────────────────────────────────────────────────────── */
function renderAnalisis3(lista, n, pHat) {
  const el = document.getElementById('analisis-3');
  if (n < 10) { el.innerHTML = `<p class="analisis-aviso">Responde al menos 10 ejercicios (llevas ${n}).</p>`; return; }

  const zc = window.Estadistica.calcularZcritico(0.05, 'bilateral');
  const se = Math.sqrt((pHat * (1 - pHat)) / n);
  const me = zc * se;
  const li = Math.max(0, pHat - me);
  const ls = Math.min(1, pHat + me);

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
   Prueba Z de diferencia de dos proporciones.
   Requiere al menos 8 de cada tipo.
─────────────────────────────────────────────────────────────── */
function renderAnalisis4(lista) {
  const el = document.getElementById('analisis-4');

  /* Supabase usa 'tema', localStorage usaba 'tipo' — manejamos ambos */
  const grupoZ  = lista.filter(r => (r.tema || r.tipo) === 'prueba_z');
  const grupoIC = lista.filter(r => (r.tema || r.tipo) === 'intervalo_confianza');

  if (grupoZ.length < 8 || grupoIC.length < 8) {
    el.innerHTML = `<p class="analisis-aviso">Necesitas al menos 8 de cada tipo.<br>Prueba Z: ${grupoZ.length}/8 · IC: ${grupoIC.length}/8</p>`;
    return;
  }

  const E  = window.Estadistica;
  const n1 = grupoZ.length;
  const n2 = grupoIC.length;
  const p1 = grupoZ.filter(r => r.correcto).length  / n1;
  const p2 = grupoIC.filter(r => r.correcto).length / n2;

  const pComb = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se    = Math.sqrt(pComb * (1 - pComb) * (1/n1 + 1/n2));
  const z     = (p1 - p2) / se;
  const pval  = E.calcularPvalor(z, 'bilateral');
  const rech  = E.tomarDecision(pval, 0.05);

  const mejor      = p1 > p2 ? 'Prueba Z' : 'Intervalos de confianza';
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

/* ── renderHistorial ─────────────────────────────────────────
   Lista los últimos ejercicios con hora, tipo y resultado.
─────────────────────────────────────────────────────────────── */
function renderHistorial(lista) {
  const el = document.getElementById('historial-lista');
  if (lista.length === 0) { el.innerHTML = '<p class="analisis-aviso">Sin ejercicios respondidos aún.</p>'; return; }

  el.innerHTML = lista.map(r => {
    const hora   = new Date(r.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const tipo   = r.tema || r.tipo; // Supabase usa 'tema', localStorage usaba 'tipo'
    const nombre = tipo === 'prueba_z' ? 'Prueba Z' : 'IC';
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
   ============================================================ */

for (let i = 0; i < 4; i++) {
  document.getElementById(`op-${i}`).addEventListener('click', () => seleccionarOpcion(i));
}

document.getElementById('btn-verificar').addEventListener('click', verificar);
document.getElementById('btn-nuevo').addEventListener('click', nuevoEjercicio);

document.getElementById('btn-limpiar').addEventListener('click', async () => {
  /* Limpiar no borra Supabase, solo refresca la vista */
  await renderProgreso();
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', async () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('activo'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('activo'));
    tab.classList.add('activo');
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('activo');
    if (tab.dataset.tab === 'progreso') await renderProgreso();
  });
});

/* Arranque */
nuevoEjercicio();
renderProgreso();