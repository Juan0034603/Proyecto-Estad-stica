/* ============================================================
   analisis.js — Dashboard del administrador
   Depende de: auth.js, db.js, estadistica.js, curva.js
   ============================================================ */

/* Proteger la página: solo entra el administrador */
protegerAdmin();

/* Tipo de análisis activo: 1 = un grupo, 2 = comparativa */
let tipoActual = 1;

/* ── cambiarTipo(tipo) ────────────────────────────────────────
   Alterna entre análisis de un grupo y comparativa.
   Muestra u oculta el selector del grupo B.
─────────────────────────────────────────────────────────────── */
function cambiarTipo(tipo) {
  tipoActual = tipo;

  document.getElementById('btn-tipo-1').classList.toggle('activo', tipo === 1);
  document.getElementById('btn-tipo-2').classList.toggle('activo', tipo === 2);

  /* Grupo B solo aparece en la comparativa */
  document.getElementById('config-grupoB').style.display = tipo === 2 ? 'flex' : 'none';

  /* Cambiar la etiqueta del grupo A según el tipo */
  document.getElementById('label-grupoA').textContent = tipo === 2 ? 'Grupo A' : 'Grupo';

  /* Limpiar resultado anterior */
  document.getElementById('resultado-titulo').textContent   = 'Configura los parámetros y haz clic en Analizar';
  document.getElementById('resultado-contenido').innerHTML  = '<p class="analisis-aviso">El análisis aparecerá aquí.</p>';
}

/* ── ejecutarAnalisis() ───────────────────────────────────────
   Lee los selectores y llama al análisis correspondiente.
─────────────────────────────────────────────────────────────── */
async function ejecutarAnalisis() {
  const grupoA = document.getElementById('sel-grupoA').value;
  const grupoB = document.getElementById('sel-grupoB').value;
  const tema   = document.getElementById('sel-tema').value;

  /* Cargar todos los ejercicios desde Supabase */
  const todos = await obtenerTodosLosEjerciciosDB();

  if (!todos || todos.length === 0) {
    mostrarResultado('Sin datos', '<p class="analisis-aviso">No hay ejercicios registrados aún.</p>');
    return;
  }

  /* Actualizar métricas globales */
  actualizarGlobales(todos);

  if (tipoActual === 1) {
    analizarUnGrupo(todos, grupoA, tema);
  } else {
    analizarDosGrupos(todos, grupoA, grupoB, tema);
  }
}

/* ── actualizarGlobales(todos) ────────────────────────────────
   Calcula y muestra las 4 métricas globales del curso.
─────────────────────────────────────────────────────────────── */
function actualizarGlobales(todos) {
  const total       = todos.length;
  const estudiantes = new Set(todos.map(r => r.usuario_id)).size;
  const correctos   = todos.filter(r => r.correcto).length;
  const precision   = total > 0 ? (correctos / total * 100).toFixed(1) : 0;

  const hoy     = new Date().toDateString();
  const deHoy   = todos.filter(r => new Date(r.fecha).toDateString() === hoy).length;

  document.getElementById('g-total').textContent       = total;
  document.getElementById('g-estudiantes').textContent = estudiantes;
  document.getElementById('g-precision').textContent   = `${precision}%`;
  document.getElementById('g-hoy').textContent         = deHoy;
}

/* ── analizarUnGrupo(todos, grupo, tema) ──────────────────────
   Prueba Z de proporción para un grupo.
   H₀: p = 0.50 (responden al azar)
   H₁: p > 0.50 (hay aprendizaje real)
   α = 0.05, cola derecha
─────────────────────────────────────────────────────────────── */
async function analizarUnGrupo(todos, grupo, tema) {
  /* Obtener usuarios del grupo seleccionado desde Supabase */
  let datos = todos;

  if (grupo !== 'todos') {
    /* Filtrar por grupo: necesitamos cruzar con la tabla usuarios */
    const idsGrupo = await obtenerIdsDeGrupo(grupo);
    datos = todos.filter(r => idsGrupo.includes(r.usuario_id));
  }

  /* Filtrar por tema si se seleccionó uno */
  if (tema !== 'todos') {
    datos = datos.filter(r => r.tema === tema);
  }

  const n         = datos.length;
  const correctos = datos.filter(r => r.correcto).length;

  if (n < 10) {
    const nombreGrupo = grupo === 'todos' ? 'el curso' : grupo;
    mostrarResultado(
      `Análisis de ${nombreGrupo}`,
      `<p class="analisis-aviso">Se necesitan al menos 10 ejercicios. ${nombreGrupo} tiene ${n}.</p>`
    );
    return;
  }

  const E    = window.Estadistica;
  const pHat = correctos / n;
  const p0   = 0.5;
  const z    = (pHat - p0) / Math.sqrt((p0 * (1 - p0)) / n);
  const pval = E.calcularPvalor(z, 'derecha');
  const zc   = E.calcularZcritico(0.05, 'derecha');
  const rech = E.tomarDecision(pval, 0.05);

  const nombreGrupo = grupo === 'todos' ? 'Todo el curso' : grupo.charAt(0).toUpperCase() + grupo.slice(1);
  const nombreTema  = tema  === 'todos' ? 'todos los temas' : (tema === 'prueba_z' ? 'Prueba Z' : 'Intervalos de confianza');

  const conclusion = rech
    ? `✓ ${nombreGrupo} responde significativamente mejor que el azar en ${nombreTema}. Hay evidencia de aprendizaje.`
    : `◦ No hay evidencia suficiente de que ${nombreGrupo} responda mejor que el azar en ${nombreTema}.`;

  const html = `
    <div class="metricas" style="margin-bottom:16px;">
      <div class="metrica"><div class="metrica__label">n (ejercicios)</div><div class="metrica__valor">${n}</div></div>
      <div class="metrica"><div class="metrica__label">Correctos</div><div class="metrica__valor">${correctos}</div></div>
      <div class="metrica"><div class="metrica__label">p̂ (precisión)</div><div class="metrica__valor">${(pHat*100).toFixed(1)}%</div></div>
      <div class="metrica"><div class="metrica__label">p₀ (H₀)</div><div class="metrica__valor">50%</div></div>
      <div class="metrica"><div class="metrica__label">Estadístico Z</div><div class="metrica__valor">${z.toFixed(4)}</div></div>
      <div class="metrica"><div class="metrica__label">Z crítico</div><div class="metrica__valor">${zc.toFixed(4)}</div></div>
      <div class="metrica"><div class="metrica__label">p-valor</div><div class="metrica__valor">${pval.toFixed(4)}</div></div>
      <div class="metrica"><div class="metrica__label">α</div><div class="metrica__valor">0.05</div></div>
    </div>
    <div class="canvas-wrapper" style="margin-bottom:16px;">
      <canvas id="curva-admin" style="height:160px;"></canvas>
    </div>
    <div class="veredicto ${rech ? 'veredicto--acepta' : 'veredicto--neutro'}">${conclusion}</div>
  `;

  mostrarResultado(`Análisis — ${nombreGrupo} · ${nombreTema}`, html);
  window.dibujarCurva('curva-admin', z, zc, 'derecha', rech);
}

/* ── analizarDosGrupos(todos, grupoA, grupoB, tema) ───────────
   Prueba Z de diferencia de dos proporciones.
   H₀: pA = pB (los grupos rinden igual)
   H₁: pA ≠ pB (hay diferencia significativa)
   α = 0.05, bilateral
─────────────────────────────────────────────────────────────── */
async function analizarDosGrupos(todos, grupoA, grupoB, tema) {
  if (grupoA === grupoB || grupoA === 'todos' || grupoB === 'todos') {
    mostrarResultado('Error', '<p class="analisis-aviso">Selecciona dos grupos distintos para la comparativa.</p>');
    return;
  }

  /* Obtener IDs de cada grupo */
  const [idsA, idsB] = await Promise.all([
    obtenerIdsDeGrupo(grupoA),
    obtenerIdsDeGrupo(grupoB),
  ]);

  let datosA = todos.filter(r => idsA.includes(r.usuario_id));
  let datosB = todos.filter(r => idsB.includes(r.usuario_id));

  /* Filtrar por tema si aplica */
  if (tema !== 'todos') {
    datosA = datosA.filter(r => r.tema === tema);
    datosB = datosB.filter(r => r.tema === tema);
  }

  const n1 = datosA.length;
  const n2 = datosB.length;

  if (n1 < 10 || n2 < 10) {
    mostrarResultado('Datos insuficientes', `
      <p class="analisis-aviso">
        Se necesitan al menos 10 ejercicios por grupo.<br>
        ${grupoA}: ${n1} · ${grupoB}: ${n2}
      </p>
    `);
    return;
  }

  const E  = window.Estadistica;
  const p1 = datosA.filter(r => r.correcto).length / n1;
  const p2 = datosB.filter(r => r.correcto).length / n2;

  /* Proporción combinada para la prueba */
  const pComb = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se    = Math.sqrt(pComb * (1 - pComb) * (1/n1 + 1/n2));
  const z     = (p1 - p2) / se;
  const pval  = E.calcularPvalor(z, 'bilateral');
  const zc    = E.calcularZcritico(0.05, 'bilateral');
  const rech  = E.tomarDecision(pval, 0.05);

  const nombreA    = grupoA.charAt(0).toUpperCase() + grupoA.slice(1);
  const nombreB    = grupoB.charAt(0).toUpperCase() + grupoB.slice(1);
  const mejor      = p1 > p2 ? nombreA : nombreB;
  const nombreTema = tema === 'todos' ? 'todos los temas' : (tema === 'prueba_z' ? 'Prueba Z' : 'Intervalos de confianza');

  const conclusion = rech
    ? `✓ Hay diferencia estadísticamente significativa. ${mejor} tiene mejor rendimiento en ${nombreTema}.`
    : `◦ No hay diferencia significativa entre ${nombreA} y ${nombreB} en ${nombreTema}.`;

  const html = `
    <div class="metricas" style="margin-bottom:16px;">
      <div class="metrica"><div class="metrica__label">${nombreA} — n</div><div class="metrica__valor">${n1}</div></div>
      <div class="metrica"><div class="metrica__label">${nombreA} — precisión</div><div class="metrica__valor">${(p1*100).toFixed(1)}%</div></div>
      <div class="metrica"><div class="metrica__label">${nombreB} — n</div><div class="metrica__valor">${n2}</div></div>
      <div class="metrica"><div class="metrica__label">${nombreB} — precisión</div><div class="metrica__valor">${(p2*100).toFixed(1)}%</div></div>
      <div class="metrica"><div class="metrica__label">Estadístico Z</div><div class="metrica__valor">${z.toFixed(4)}</div></div>
      <div class="metrica"><div class="metrica__label">Z crítico</div><div class="metrica__valor">±${zc.toFixed(4)}</div></div>
      <div class="metrica"><div class="metrica__label">p-valor</div><div class="metrica__valor">${pval.toFixed(4)}</div></div>
      <div class="metrica"><div class="metrica__label">α</div><div class="metrica__valor">0.05</div></div>
    </div>
    <div class="canvas-wrapper" style="margin-bottom:16px;">
      <canvas id="curva-admin" style="height:160px;"></canvas>
    </div>
    <div class="veredicto ${rech ? 'veredicto--acepta' : 'veredicto--neutro'}">${conclusion}</div>
  `;

  mostrarResultado(`Comparativa — ${nombreA} vs ${nombreB} · ${nombreTema}`, html);
  window.dibujarCurva('curva-admin', z, zc, 'bilateral', rech);
}

/* ── obtenerIdsDeGrupo(grupo) ─────────────────────────────────
   Consulta Supabase para obtener los usuario_id que pertenecen
   a un grupo específico. Se usa para filtrar ejercicios.
─────────────────────────────────────────────────────────────── */
async function obtenerIdsDeGrupo(grupo) {
  const token = localStorage.getItem('sb_token');
  try {
    const res = await fetch(
      `https://pidjkietkwddeqxpvonv.supabase.co/rest/v1/usuarios?grupo=eq.${grupo}&select=id`,
      {
        headers: {
          'apikey':        'sb_publishable_khALbTOTOfNwZJGOi8AiGg_qOikqQW7',
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        }
      }
    );
    const usuarios = await res.json();
    return usuarios.map(u => u.id);
  } catch (err) {
    console.error('Error obteniendo IDs del grupo:', err);
    return [];
  }
}

/* ── mostrarResultado(titulo, html) ───────────────────────────
   Actualiza el panel de resultado con título y contenido.
─────────────────────────────────────────────────────────────── */
function mostrarResultado(titulo, html) {
  document.getElementById('resultado-titulo').textContent  = titulo;
  document.getElementById('resultado-contenido').innerHTML = html;
}

/* ── Arranque: cargar métricas globales al abrir ──────────────*/
(async () => {
  const todos = await obtenerTodosLosEjerciciosDB();
  if (todos && todos.length > 0) actualizarGlobales(todos);
})();